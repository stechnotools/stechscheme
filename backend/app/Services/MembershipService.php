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

        if (! empty($filters['search'])) {
            $search = trim((string) $filters['search']);

            $query->where(function ($builder) use ($search) {
                $builder
                    ->whereHas('customer', function ($customerQuery) use ($search) {
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
        $perPage = max(1, min((int) ($filters['per_page'] ?? 15), 100));

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

            if (($options['skip_kyc_check'] ?? false) !== true && ($customer->kyc?->status ?? 'pending') !== 'approved') {
                abort(422, 'Customer KYC must be approved before enrollment.');
            }

            $membership = Membership::query()->create([
                ...$validated,
                'membership_no' => $validated['membership_no'] ?? null,
                'card_no' => $validated['card_no'] ?? null,
                'card_reference' => $validated['card_reference'] ?? null,
                'card_issued_at' => $validated['card_issued_at'] ?? null,
                'maturity_date' => $this->resolveMaturityDate((string) $validated['start_date'], $scheme),
                'total_paid' => $validated['total_paid'] ?? 0,
                'status' => $validated['status'] ?? 'active',
            ]);

            $this->generateInstallments($membership, $scheme);

            return $membership->fresh(['customer.kyc', 'user', 'scheme.maturityBenefits', 'installments', 'payments.installment']);
        });
    }

    private function resolveMaturityDate(string $startDate, Scheme $scheme): string
    {
        $months = max(1, (int) ($scheme->total_installments ?? 1));

        return Carbon::parse($startDate)->copy()->addMonthsNoOverflow($months - 1)->toDateString();
    }

    private function generateInstallments(Membership $membership, Scheme $scheme): void
    {
        $totalInstallments = max(1, (int) ($scheme->total_installments ?? 1));
        $installmentAmount = (float) ($scheme->installment_value ?? 0);
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
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        Installment::query()->insert($rows);
    }
}
