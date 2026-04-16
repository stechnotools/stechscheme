<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerKyc;
use App\Models\Payment;
use App\Models\Branch;
use App\Models\Scheme;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class OneClickEnrollmentService
{
    public function __construct(
        private readonly CustomerService $customerService,
        private readonly MembershipService $membershipService
    ) {
    }

    public function enroll(array $validated, ?User $staffUser = null): array
    {
        return DB::transaction(function () use ($validated, $staffUser) {
            $customerPayload = [
                'name' => data_get($validated, 'customer.name'),
                'mobile' => data_get($validated, 'customer.mobile'),
                'email' => data_get($validated, 'customer.email'),
                'status' => data_get($validated, 'customer.status', 'active'),
                'portal_enabled' => true,
                'portal_password' => data_get($validated, 'customer.portal_password'),
            ];

            $existingCustomer = Customer::query()
                ->where('mobile', $customerPayload['mobile'])
                ->first();

            $customer = $existingCustomer
                ? $this->customerService->update($existingCustomer, $customerPayload)
                : $this->customerService->create($customerPayload);

            if (! $customer->kyc) {
                CustomerKyc::query()->create([
                    'customer_id' => $customer->id,
                    'status' => 'pending',
                ]);
                $customer->load('kyc');
            }

            $scheme = Scheme::query()->with('maturityBenefits')->findOrFail($validated['scheme_id']);
            $membershipSeed = $this->buildMembershipIdentifiers($customer, $scheme);

            $membership = $this->membershipService->createWithOptions([
                'customer_id' => $customer->id,
                'user_id' => data_get($validated, 'user_id') ?: $staffUser?->id ?: $customer->user_id,
                'scheme_id' => $scheme->id,
                'membership_no' => $membershipSeed['membership_no'],
                'card_no' => $membershipSeed['card_no'],
                'card_reference' => $membershipSeed['card_reference'],
                'card_issued_at' => now(),
                'start_date' => $validated['start_date'],
                'status' => 'active',
            ], [
                'skip_kyc_check' => true,
            ]);

            $firstPayment = null;
            $paymentAmount = (float) (data_get($validated, 'payment.amount') ?? $scheme->installment_value ?? 0);

            if ($paymentAmount > 0) {
                $firstInstallment = $membership->installments()->orderBy('installment_no')->firstOrFail();

                $firstPayment = Payment::query()->create([
                    'membership_id' => $membership->id,
                    'installment_id' => $firstInstallment->id,
                    'amount' => $paymentAmount,
                    'gateway' => data_get($validated, 'payment.gateway', 'cash'),
                    'transaction_id' => data_get($validated, 'payment.transaction_id'),
                    'payment_date' => data_get($validated, 'payment.payment_date', $validated['start_date']),
                    'status' => data_get($validated, 'payment.status', 'success'),
                ]);

                app(PaymentService::class)->syncPaymentState($firstPayment);
            }

            $membership = $membership->fresh([
                'customer.kyc',
                'customer.user',
                'user',
                'user.branches',
                'scheme.maturityBenefits',
                'installments.payments',
                'payments.installment',
            ]);

            $selectedBranch = data_get($validated, 'branch_id')
                ? Branch::query()->find(data_get($validated, 'branch_id'))
                : null;

            return [
                'customer' => $customer->fresh(['kyc', 'user']),
                'membership' => $membership,
                'payment' => $firstPayment?->fresh(['installment']),
                'scheme' => $scheme,
                'card' => [
                    'membership_no' => $membership->membership_no,
                    'card_no' => $membership->card_no,
                    'card_reference' => $membership->card_reference,
                    'issued_at' => optional($membership->card_issued_at)->toISOString(),
                ],
                'summary' => [
                    'created_by' => $staffUser?->only(['id', 'name']),
                    'portal_login_mobile' => $customer->mobile,
                    'kyc_status' => $customer->kyc?->status,
                    'selected_salesman' => $membership->user?->only(['id', 'name', 'mobile']),
                    'selected_branch' => $selectedBranch?->only(['id', 'name', 'code', 'city']),
                    'total_installments' => $membership->installments->count(),
                    'paid_installments' => $membership->installments->where('paid', true)->count(),
                    'total_paid' => (float) $membership->total_paid,
                    'maturity_date' => optional($membership->maturity_date)->toDateString(),
                ],
            ];
        });
    }

    private function buildMembershipIdentifiers(Customer $customer, Scheme $scheme): array
    {
        $stamp = now()->format('ymd');
        $sequence = str_pad((string) ((int) Customer::query()->count() + (int) $scheme->id), 4, '0', STR_PAD_LEFT);

        return [
            'membership_no' => sprintf('MEM-%s-%s', $stamp, $sequence),
            'card_no' => sprintf('CARD-%d-%s', $customer->id, Str::upper(Str::random(6))),
            'card_reference' => sprintf('JS-%d-%d-%s', $customer->id, $scheme->id, Str::upper(Str::random(8))),
        ];
    }
}
