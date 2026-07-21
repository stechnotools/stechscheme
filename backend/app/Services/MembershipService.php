<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Installment;
use App\Models\Membership;
use App\Models\Scheme;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class MembershipService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = Membership::query()->with(['customer.kyc', 'user', 'scheme', 'installments', 'payments.installment']);

        foreach (['customer_id', 'user_id', 'scheme_id', 'status'] as $field) {
            if (! empty($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }

        // status_group filter: groups multiple statuses together
        if (! empty($filters['status_group'])) {
            $group = (string) $filters['status_group'];
            $groupMap = [
                'active'   => ['active', 'paused'],
                'matured'  => ['matured', 'completed'],
                'redeemed' => ['redeemed', 'settled'],
                'closed'   => ['cancelled', 'closed'],
            ];
            if (isset($groupMap[$group])) {
                $query->whereIn('status', $groupMap[$group]);
            }
        }

        if (! empty($filters['search'])) {
            $search = trim((string) $filters['search']);

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('membership_no', 'like', "%{$search}%")
                    ->orWhere('card_no', 'like', "%{$search}%")
                    ->orWhere('passbook_no', 'like', "%{$search}%")
                    ->orWhere('ticket_no', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('mobile', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhereHas('scheme', function ($schemeQuery) use ($search) {
                        $schemeQuery
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    });
            });
        }

        $sortBy = (string) ($filters['sort_by'] ?? 'id');
        $sortBy = in_array($sortBy, ['id', 'start_date', 'maturity_date', 'total_paid', 'created_at', 'updated_at'], true)
            ? $sortBy
            : 'id';
        $sortDirection = strtolower((string) ($filters['sort_direction'] ?? 'desc')) === 'asc' ? 'asc' : 'desc';
        $perPage = max(1, min((int) ($filters['per_page'] ?? 15), 500));

        return $query->orderBy($sortBy, $sortDirection)->paginate($perPage);
    }

    public function create(array $validated): Membership
    {
        return $this->createWithOptions($validated);
    }

    public function createWithOptions(array $validated, array $options = []): Membership
    {
        return DB::transaction(function () use ($validated, $options) {
            $scheme = Scheme::query()->findOrFail($validated['scheme_id']);
            $customer = Customer::query()->with('kyc')->findOrFail($validated['customer_id']);
            $installmentAmount = array_key_exists('installment_value', $validated) && $validated['installment_value'] !== null
                ? max(0, (float) $validated['installment_value'])
                : null;
            $membershipPayload = $validated;
            unset($membershipPayload['installment_value']);

            if (($options['skip_kyc_check'] ?? false) !== true && ($customer->kyc?->status ?? 'pending') !== 'approved') {
                abort(422, 'Customer KYC must be approved before enrollment.');
            }

            // Lock in the scheme's terms as they exist right now, so later
            // edits to the Scheme template (installment value, closing
            // penalty, bonus rules, etc.) never retroactively change what
            // this membership already agreed to.
            $schemeSnapshot = array_merge(
                $scheme->only(Membership::SCHEME_SNAPSHOT_FIELDS),
                ['installment_value' => $installmentAmount ?? (float) ($scheme->installment_value ?? 0)]
            );

            $membership = Membership::query()->create([
                ...$membershipPayload,
                'membership_no' => $validated['membership_no'] ?? null,
                'card_no' => $validated['card_no'] ?? null,
                'card_reference' => $validated['card_reference'] ?? null,
                'card_issued_at' => $validated['card_issued_at'] ?? null,
                'maturity_date' => $this->resolveMaturityDate((string) $validated['start_date'], $scheme),
                'total_paid' => $validated['total_paid'] ?? 0,
                'status' => $validated['status'] ?? 'active',
                'scheme_snapshot' => $schemeSnapshot,
            ]);

            $this->generateInstallments($membership, $scheme, $installmentAmount);

            return $membership->fresh(['customer.kyc', 'user', 'scheme.maturityBenefits', 'installments', 'payments.installment']);
        });
    }

    private function resolveMaturityDate(string $startDate, Scheme $scheme): string
    {
        $months = max(1, (int) ($scheme->total_installments ?? 1));

        return Carbon::parse($startDate)->copy()->addMonthsNoOverflow($months - 1)->toDateString();
    }

    /**
     * Recompute maturity_date and every installment's due_date from the
     * membership's (already-updated) start_date, using the same formula
     * generateInstallments()/resolveMaturityDate() use at enrollment — so
     * correcting the opening date after the fact keeps the whole schedule
     * internally consistent instead of leaving stale due dates behind.
     * paid_date, paid_amount, penalty and payment history are untouched;
     * only the due_date label moves.
     */
    public function realignScheduleToStartDate(Membership $membership): void
    {
        DB::transaction(function () use ($membership) {
            $scheme = $membership->scheme ?? Scheme::query()->find($membership->scheme_id);
            $startDate = Carbon::parse($membership->start_date);

            $membership->installments()->orderBy('installment_no')->get()->each(function (Installment $installment) use ($startDate) {
                $installment->update([
                    'due_date' => $startDate->copy()->addMonthsNoOverflow($installment->installment_no - 1)->toDateString(),
                ]);
            });

            if ($scheme) {
                $membership->update([
                    'maturity_date' => $this->resolveMaturityDate($startDate->toDateString(), $scheme),
                ]);
            }
        });
    }

    private function generateInstallments(Membership $membership, Scheme $scheme, ?float $customInstallmentAmount = null): void
    {
        $totalInstallments = max(1, (int) ($scheme->total_installments ?? 1));
        $installmentAmount = $customInstallmentAmount ?? (float) ($scheme->installment_value ?? 0);
        $startDate = Carbon::parse($membership->start_date);
        $rows = [];

        for ($index = 1; $index <= $totalInstallments; $index++) {
            $rows[] = [
                'membership_id' => $membership->id,
                'installment_no' => $index,
                'due_date' => $startDate->copy()->addMonthsNoOverflow($index - 1)->toDateString(),
                'amount' => $installmentAmount,
                'paid' => false,
                'paid_date' => null,
                'penalty' => 0,
                'paid_amount' => 0,
                'balance_amount' => $installmentAmount,
                'status' => 'PENDING',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        Installment::query()->insert($rows);
    }
}
