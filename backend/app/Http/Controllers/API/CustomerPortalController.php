<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\CustomerPortalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerPortalController extends Controller
{
    public function __construct(private readonly CustomerPortalService $customerPortalService)
    {
    }

    public function dashboard(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        return response()->json([
            'data' => $this->customerPortalService->dashboard($customer),
        ]);
    }

    public function profile(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $this->customerPortalService->resolveCustomerForUser($user),
        ]);
    }

    public function memberships(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        return response()->json([
            'data' => $customer->memberships,
        ]);
    }

    public function showMembership(Request $request, int $membership): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        return response()->json([
            'data' => $this->customerPortalService->membership($customer, $membership),
        ]);
    }

    public function installments(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);
        $membershipId = $request->integer('membership_id');

        $installments = $customer->memberships
            ->when($membershipId > 0, fn ($collection) => $collection->where('id', $membershipId))
            ->flatMap(fn ($membership) => $membership->installments)
            ->sortBy('due_date')
            ->values();

        return response()->json([
            'data' => $installments,
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);
        $membershipId = $request->integer('membership_id');

        $payments = $customer->memberships
            ->when($membershipId > 0, fn ($collection) => $collection->where('id', $membershipId))
            ->flatMap(fn ($membership) => $membership->payments)
            ->sortByDesc('payment_date')
            ->values();

        return response()->json([
            'data' => $payments,
        ]);
    }
}
