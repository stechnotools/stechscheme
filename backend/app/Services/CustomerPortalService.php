<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Membership;
use App\Models\User;

class CustomerPortalService
{
    public function resolveCustomerForUser(User $user): Customer
    {
        return Customer::query()
            ->with([
                'kyc',
                'user',
                'memberships.scheme.maturityBenefits',
                'memberships.installments.payments',
                'memberships.payments.installment',
            ])
            ->where('user_id', $user->id)
            ->firstOrFail();
    }

    public function dashboard(Customer $customer): array
    {
        $memberships = $customer->memberships;
        $payments = $memberships->flatMap(fn ($membership) => $membership->payments)->sortByDesc('payment_date')->values();
        $installments = $memberships->flatMap(fn ($membership) => $membership->installments)->sortBy('due_date')->values();

        return [
            'customer' => $customer,
            'summary' => [
                'memberships_count' => $memberships->count(),
                'active_memberships_count' => $memberships->where('status', 'active')->count(),
                'total_paid' => (float) $memberships->sum('total_paid'),
                'pending_installments_count' => $installments->where('paid', false)->count(),
                'overdue_installments_count' => $installments->filter(fn ($installment) => ! $installment->paid && $installment->due_date?->isPast())->count(),
                'next_due_date' => optional($installments->first(fn ($installment) => ! $installment->paid))->due_date?->toDateString(),
                'latest_payment_date' => optional($payments->first())->payment_date?->toDateString(),
            ],
            'memberships' => $memberships->values(),
            'recent_payments' => $payments->take(5)->values(),
        ];
    }

    public function membership(Customer $customer, int $membershipId): Membership
    {
        return $customer->memberships()
            ->with(['scheme.maturityBenefits', 'installments.payments', 'payments.installment'])
            ->findOrFail($membershipId);
    }
}
