<?php

namespace App\Services;

use App\Models\Scheme;
use App\Models\SchemeOpening;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

/**
 * Shared "enroll one staged scheme opening row" logic, used by both the
 * synchronous (foreground) process endpoint and the queued background job —
 * so the two processing modes can never drift apart.
 */
class SchemeOpeningProcessingService
{
    public function __construct(
        private readonly OneClickEnrollmentService $oneClickEnrollmentService
    ) {
    }

    /**
     * @return array<string, Scheme> map keyed by id / lowercase name / lowercase code
     */
    public function buildSchemeMap(): array
    {
        $schemeMap = [];

        foreach (Scheme::all() as $s) {
            $schemeMap[(string) $s->id] = $s;
            $schemeMap[strtolower(trim($s->name))] = $s;
            if (!empty($s->code)) {
                $schemeMap[strtolower(trim($s->code))] = $s;
            }
        }

        return $schemeMap;
    }

    /**
     * Process a single staged row: resolves scheme/salesman, performs the
     * one-click enrollment, and persists the resulting status — success or
     * failure — directly onto the row. Returns true on success.
     *
     * @param array<string, Scheme> $schemeMap
     * @param array<string, User> $resolvedSalesmen cache, accumulates across calls
     */
    public function processOne(SchemeOpening $data, array $schemeMap, array &$resolvedSalesmen): bool
    {
        DB::beginTransaction();
        $originalSalesmanId = $data->salesman_id;

        try {
            // 1. Resolve Scheme from memory
            $scheme = null;
            if (!empty($data->scheme_id)) {
                $scheme = $schemeMap[(string) $data->scheme_id] ?? null;
            }
            if (!$scheme && !empty($data->scheme_name)) {
                $scheme = $schemeMap[strtolower(trim($data->scheme_name))] ?? null;
            }

            if (!$scheme) {
                throw new \Exception('Scheme not found. Please verify the Scheme Name.');
            }

            // 1b. Resolve salesman, auto-creating a user record if the name has no match
            if (empty($data->salesman_id) && !empty(trim((string) $data->salesman))) {
                $data->salesman_id = $this->resolveOrCreateSalesman(trim($data->salesman), $resolvedSalesmen);
            }

            // 1c. Keep the salesman's branch assignment in sync with the branch used
            // on this opening — applies to existing salesmen too, not just newly
            // auto-created ones, since a salesman can be entered for a branch
            // they weren't previously assigned to.
            if (!empty($data->salesman_id) && !empty($data->branch_id)) {
                $this->syncSalesmanBranch((int) $data->salesman_id, (int) $data->branch_id);
            }

            // 2. Perform One-Click Enrollment (it handles customer lookup/creation/update internally)
            $enrollPayload = [
                'customer' => [
                    'name'      => $data->account_name,
                    'mobile'    => $data->mobile_no,
                    'status'    => 'active',
                    'branch_id' => $data->branch_id,
                ],
                'scheme_id'          => $scheme->id,
                'user_id'            => $data->salesman_id,
                'branch_id'          => $data->branch_id,
                'start_date'         => $data->opening_date->format('Y-m-d'),
                'installment_value'  => !empty($data->installment_amount) ? (float) $data->installment_amount : null,
                'membership_no'      => !empty($data->ticket_no) ? $data->ticket_no : null,
                'payment' => [
                    'amount'       => (float) $data->total_amount,
                    'gateway'      => 'cash',
                    'payment_date' => $data->opening_date->format('Y-m-d'),
                    'status'       => 'success',
                ],
                // Commission for CSV-imported scheme openings is not auto-calculated —
                // use the "Generate Commission" action on the Salesman Detail page instead.
                'skip_commission' => true,
            ];

            $enrollResult = $this->oneClickEnrollmentService->enroll($enrollPayload);

            // Update the staged record details with the correct linked ids
            $data->customer_id = $enrollResult['customer']->id;
            $data->scheme_id = $scheme->id;
            $data->status = 'Processed';
            $data->error_message = null;
            $data->save();

            DB::commit();

            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            // The transaction rollback also undid any auto-created salesman user,
            // so restore the original (pre-attempt) salesman_id to avoid a dangling reference.
            $data->salesman_id = $originalSalesmanId;
            $data->status = 'Failed';
            $data->error_message = $e->getMessage();
            $data->save();

            return false;
        }
    }

    /**
     * Attach a branch to a salesman's branch list if it isn't already there.
     * Uses syncWithoutDetaching so a salesman working across multiple
     * branches keeps their existing assignments.
     */
    private function syncSalesmanBranch(int $salesmanId, int $branchId): void
    {
        $user = User::find($salesmanId);

        $user?->branches()->syncWithoutDetaching([$branchId]);
    }

    /**
     * Resolve an existing user by salesman name, or auto-create one (with the
     * 'salesman' role) when no match exists. Results are cached per batch run
     * (keyed by lowercase name) so the same new name isn't created twice.
     *
     * @param array<string, User> $cache
     */
    public function resolveOrCreateSalesman(string $salesmanName, array &$cache): int
    {
        $key = strtolower($salesmanName);

        if (isset($cache[$key])) {
            return $cache[$key]->id;
        }

        $user = User::whereRaw('LOWER(name) = ?', [$key])->first();

        if (! $user) {
            $emailSlug = Str::slug($salesmanName) ?: 'salesman';

            $user = User::create([
                'name' => $salesmanName,
                'email' => "salesman.{$emailSlug}." . Str::lower(Str::random(6)) . '@internal.local',
                'password' => Hash::make(Str::random(16)),
                'status' => 'active',
            ]);

            $user->assignRole(Role::findOrCreate('salesman', 'web'));
        }

        $cache[$key] = $user;

        return $user->id;
    }
}
