<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Membership;
use App\Models\User;
use App\Services\CustomerRelativeRequestService;

class CustomerPortalService
{
    public function __construct(
        private readonly CustomerRelativeRequestService $customerRelativeRequestService
    ) {
    }

    /**
     * Resolve "the" Customer profile for a portal session. Normally there is
     * only one, but a household can share a single mobile/login across
     * several Customer profiles — in that case, prefer the profile the
     * customer last picked (User::default_customer_id, set via
     * CustomerPortalController::selectProfile()) and fall back to whichever
     * profile comes first only if no default has been chosen yet.
     */
    public function resolveCustomerForUser(User $user): Customer
    {
        $query = fn () => Customer::query()->with([
            'kyc',
            'user',
            'memberships.scheme.maturityBenefits',
            'memberships.installments.payments',
            'memberships.payments.installment',
        ])->where('user_id', $user->id);

        if ($user->default_customer_id) {
            $preferred = $query()->find($user->default_customer_id);

            if ($preferred) {
                return $preferred;
            }
        }

        return $query()->firstOrFail();
    }

    /**
     * All Customer profiles sharing this portal login, lightweight (no
     * memberships) — used by the login/profile-switcher picker. Blocked
     * (status != active) profiles are excluded; a customer can't select into
     * an account staff have disabled.
     */
    public function profilesForUser(User $user)
    {
        return Customer::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->where('portal_enabled', true)
            ->select('id', 'name', 'mobile', 'alternate_mobile', 'loyalty_card_no', 'image', 'status')
            ->orderBy('id')
            ->get();
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
                'overdue_installments_count' => $installments->filter(fn ($installment) => $installment->isOverdueNow())->count(),
                'next_due_date' => optional($installments->first(fn ($installment) => ! $installment->paid))->due_date?->toDateString(),
                'latest_payment_date' => optional($payments->first())->payment_date?->toDateString(),
            ],
            'memberships' => $memberships->values(),
            'recent_payments' => $payments->take(5)->values(),
            'relative_accounts' => $this->customerRelativeRequestService->approvedFor($customer)->values(),
            'relative_requests' => $this->customerRelativeRequestService->pendingFor($customer)->values(),
        ];
    }

    public function membership(Customer $customer, int $membershipId): Membership
    {
        return $customer->memberships()
            ->with(['scheme.maturityBenefits', 'installments.payments', 'payments.installment'])
            ->findOrFail($membershipId);
    }
}
