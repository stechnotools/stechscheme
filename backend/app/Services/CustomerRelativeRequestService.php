<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerRelativeRequest;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CustomerRelativeRequestService
{
    public function __construct(
        private readonly PushNotificationService $pushNotificationService
    ) {
    }

    public function createRequest(Customer $primaryCustomer, Customer $relativeCustomer, ?User $requestedBy = null, ?string $notes = null): CustomerRelativeRequest
    {
        if ($primaryCustomer->id === $relativeCustomer->id) {
            abort(422, 'A customer cannot be linked to themselves.');
        }

        $existing = CustomerRelativeRequest::query()
            ->where('primary_customer_id', $primaryCustomer->id)
            ->where('relative_customer_id', $relativeCustomer->id)
            ->first();

        if ($existing?->status === 'approved') {
            return $existing->fresh(['primaryCustomer', 'relativeCustomer', 'requestedByUser', 'reviewedByUser']);
        }

        $request = DB::transaction(function () use ($primaryCustomer, $relativeCustomer, $requestedBy, $notes) {
            $relativeRequest = CustomerRelativeRequest::query()->updateOrCreate(
                [
                    'primary_customer_id' => $primaryCustomer->id,
                    'relative_customer_id' => $relativeCustomer->id,
                ],
                [
                    'requested_by_user_id' => $requestedBy?->id,
                    'reviewed_by_user_id' => null,
                    'reviewed_at' => null,
                    'status' => 'pending',
                    'notes' => $notes,
                ]
            );

            return $relativeRequest->fresh(['primaryCustomer', 'relativeCustomer', 'requestedByUser', 'reviewedByUser']);
        });

        $this->sendApprovalNotification($request);

        return $request;
    }

    public function approve(CustomerRelativeRequest $request, User $reviewedBy): CustomerRelativeRequest
    {
        if ($request->status !== 'pending') {
            abort(409, 'This request has already been reviewed.');
        }

        $request->update([
            'status' => 'approved',
            'reviewed_by_user_id' => $reviewedBy->id,
            'reviewed_at' => now(),
        ]);

        return $request->fresh(['primaryCustomer', 'relativeCustomer']);
    }

    public function reject(CustomerRelativeRequest $request, User $reviewedBy, ?string $notes = null): CustomerRelativeRequest
    {
        if ($request->status !== 'pending') {
            abort(409, 'This request has already been reviewed.');
        }

        $request->update([
            'status' => 'rejected',
            'reviewed_by_user_id' => $reviewedBy->id,
            'reviewed_at' => now(),
            'notes' => $notes,
        ]);

        return $request->fresh(['primaryCustomer', 'relativeCustomer']);
    }

    public function approvedFor(Customer $customer): Collection
    {
        return CustomerRelativeRequest::query()
            ->with(['primaryCustomer.kyc', 'relativeCustomer.kyc'])
            ->where('status', 'approved')
            ->where(function ($query) use ($customer) {
                $query->where('primary_customer_id', $customer->id)
                    ->orWhere('relative_customer_id', $customer->id);
            })
            ->latest('reviewed_at')
            ->get()
            ->map(fn (CustomerRelativeRequest $request) => $this->toRelativeAccountItem($request, $customer));
    }

    public function pendingFor(Customer $customer): Collection
    {
        return CustomerRelativeRequest::query()
            ->with(['primaryCustomer.kyc', 'relativeCustomer.kyc'])
            ->where('status', 'pending')
            ->where(function ($query) use ($customer) {
                $query->where('primary_customer_id', $customer->id)
                    ->orWhere('relative_customer_id', $customer->id);
            })
            ->latest('created_at')
            ->get()
            ->map(function (CustomerRelativeRequest $request) use ($customer) {
                $otherCustomer = $request->primary_customer_id === $customer->id
                    ? $request->relativeCustomer
                    : $request->primaryCustomer;

                return [
                    'id' => $request->id,
                    'status' => $request->status,
                    'direction' => $request->primary_customer_id === $customer->id ? 'outgoing' : 'incoming',
                    'notes' => $request->notes,
                    'requested_at' => $request->created_at?->toIso8601String(),
                    'reviewed_at' => $request->reviewed_at?->toIso8601String(),
                    'customer' => $this->customerSnapshot($otherCustomer),
                ];
            });
    }

    public function toRelativeAccountItem(CustomerRelativeRequest $request, Customer $currentCustomer): array
    {
        $otherCustomer = $request->primary_customer_id === $currentCustomer->id
            ? $request->relativeCustomer
            : $request->primaryCustomer;

        return [
            'request_id' => $request->id,
            'status' => $request->status,
            'direction' => $request->primary_customer_id === $currentCustomer->id ? 'outgoing' : 'incoming',
            'notes' => $request->notes,
            'requested_at' => $request->created_at?->toIso8601String(),
            'reviewed_at' => $request->reviewed_at?->toIso8601String(),
            'customer' => $this->customerSnapshot($otherCustomer),
        ];
    }

    private function customerSnapshot(?Customer $customer): ?array
    {
        if (! $customer) {
            return null;
        }

        return [
            'id' => $customer->id,
            'name' => $customer->name,
            'mobile' => $customer->mobile,
            'alternate_mobile' => $customer->alternate_mobile,
            'loyalty_card_no' => $customer->loyalty_card_no,
            'status' => $customer->status,
        ];
    }

    private function sendApprovalNotification(CustomerRelativeRequest $request): void
    {
        $relativeCustomer = $request->relativeCustomer()->with('user')->first();

        if (! $relativeCustomer?->user) {
            return;
        }

        $title = 'Relative account request';
        $body = sprintf(
            '%s wants to add you as a relative account. Please review and approve in your portal.',
            $request->primaryCustomer?->name ?: 'A customer'
        );

        $this->pushNotificationService->sendToUser($relativeCustomer->user, $title, $body, '/customer/panel');
    }
}
