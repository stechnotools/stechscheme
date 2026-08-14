<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreCustomerRequest;
use App\Http\Requests\Customer\UpdateCustomerRequest;
use App\Models\Customer;
use App\Models\CustomerMerge;
use App\Services\CustomerMergeService;
use App\Services\CustomerRelativeRequestService;
use App\Services\CustomerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class CustomerController extends Controller
{
    public function __construct(
        private readonly CustomerService $customerService,
        private readonly CustomerMergeService $customerMergeService,
        private readonly CustomerRelativeRequestService $customerRelativeRequestService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->customerService->paginate($request->all()));
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        return response()->json([
            'message' => 'Customer created successfully.',
            'data' => $this->customerService->create($request->validated()),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $customer = Customer::query()->with([
            'user.branches',
            'kyc',
            'memberships.scheme.maturityBenefits',
            'memberships.installments',
            'memberships.payments.installment',
        ])->findOrFail($id);

        $familyProfiles = $this->customerRelativeRequestService->approvedFor($customer)
            ->map(fn (array $relativeAccount) => $relativeAccount['customer'])
            ->filter()
            ->values();

        return response()->json([
            'data' => $customer,
            'family_profiles' => $familyProfiles,
            'relative_accounts' => $this->customerRelativeRequestService->approvedFor($customer)->values(),
            'relative_requests' => $this->customerRelativeRequestService->pendingFor($customer)->values(),
            // Keep the legacy key for older screens that still rely on it.
            'sibling_profiles' => $customer->user_id
                ? Customer::query()
                    ->where('user_id', $customer->user_id)
                    ->where('id', '!=', $customer->id)
                    ->select('id', 'name', 'mobile', 'alternate_mobile', 'loyalty_card_no', 'status')
                    ->get()
                : [],
            // Merges where this customer absorbed a duplicate — reversible
            // via POST /customer-merges/{id}/undo. Undone merges are kept
            // (not hidden) so staff can see the history either way.
            'merge_history' => CustomerMerge::query()
                ->where('primary_customer_id', $customer->id)
                ->with('duplicateCustomer:id,name,mobile')
                ->latest()
                ->get(),
        ]);
    }

    public function update(UpdateCustomerRequest $request, int $id): JsonResponse
    {
        $customer = Customer::query()->findOrFail($id);

        return response()->json([
            'message' => 'Customer updated successfully.',
            'data' => $this->customerService->update($customer, $request->validated()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $customer = Customer::query()->findOrFail($id);
        $this->customerService->delete($customer);

        return response()->json([
            'message' => 'Customer deleted successfully.',
        ]);
    }

    public function regenerateLoyaltyCard(int $id): JsonResponse
    {
        $customer = Customer::query()->findOrFail($id);
        $customer = $this->customerService->regenerateLoyaltyCard($customer);

        return response()->json([
            'message' => 'Loyalty card number regenerated successfully.',
            'data' => $customer,
        ]);
    }

    public function getNextLoyaltyCardNo(): JsonResponse
    {
        return response()->json([
            'data' => $this->customerService->generateUniqueLoyaltyCardNo(),
        ]);
    }

    /**
     * Merge a duplicate Customer record (confirmed by staff to be the same
     * person, e.g. re-enrolled under a different mobile number) into this
     * one. Irreversible - see CustomerMergeService for exactly what moves.
     */
    public function merge(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'duplicate_customer_id' => 'required|integer|different:id|exists:customers,id',
        ]);

        $primary = Customer::query()->findOrFail($id);
        $duplicate = Customer::query()->findOrFail($request->input('duplicate_customer_id'));

        try {
            $merged = $this->customerMergeService->merge($primary, $duplicate);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => "Merged customer #{$duplicate->id} into #{$primary->id} successfully.",
            'data' => $merged,
        ]);
    }

    /**
     * Undo a previous merge — restores the duplicate customer (and whatever
     * of its data was absorbed) exactly as CustomerMergeService recorded it.
     */
    public function undoMerge(int $mergeId): JsonResponse
    {
        $customerMerge = CustomerMerge::query()->findOrFail($mergeId);

        try {
            $primary = $this->customerMergeService->undo($customerMerge);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => "Merge #{$mergeId} undone — customer #{$customerMerge->duplicate_customer_id} restored.",
            'data' => $primary,
        ]);
    }

    /**
     * Create a new Customer profile that shares an existing customer's
     * mobile number (e.g. a spouse or family member) - for staff to add
     * directly from the admin panel rather than only via import.
     * CustomerService::syncCustomerUser() links it to the same portal login
     * automatically since the mobile matches.
     */
    public function addLinkedProfile(StoreCustomerRequest $request, int $id): JsonResponse
    {
        $sharedWith = Customer::query()->findOrFail($id);
        $payload = $request->validated();
        $payload['mobile'] = $sharedWith->mobile;

        return response()->json([
            'message' => 'Linked profile created successfully.',
            'data' => $this->customerService->create($payload),
        ], 201);
    }

    public function sendRelativeRequest(Request $request, int $id): JsonResponse
    {
        $primaryCustomer = Customer::query()->findOrFail($id);

        $validated = $request->validate([
            'relative_customer_ids' => ['required', 'array', 'min:1'],
            'relative_customer_ids.*' => ['integer', 'distinct', 'exists:customers,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $relativeRequests = [];

        foreach ($validated['relative_customer_ids'] as $relativeCustomerId) {
            $relativeCustomer = Customer::query()->findOrFail((int) $relativeCustomerId);

            if ($relativeCustomer->id === $primaryCustomer->id) {
                continue;
            }

            $relativeRequests[] = $this->customerRelativeRequestService->createRequest(
                $primaryCustomer,
                $relativeCustomer,
                $request->user(),
                $validated['notes'] ?? null
            );
        }

        return response()->json([
            'message' => 'Relative request(s) sent successfully.',
            'data' => $relativeRequests,
        ], 201);
    }
}
