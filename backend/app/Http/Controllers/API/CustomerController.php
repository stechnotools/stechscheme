<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreCustomerRequest;
use App\Http\Requests\Customer\UpdateCustomerRequest;
use App\Models\Customer;
use App\Services\CustomerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function __construct(private readonly CustomerService $customerService)
    {
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
        return response()->json([
            'data' => Customer::query()->with(['company', 'kyc'])->findOrFail($id),
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
}
