<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Kyc\StoreKycRequest;
use App\Models\CustomerKyc;
use App\Services\KycService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KycController extends Controller
{
    public function __construct(private readonly KycService $kycService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->kycService->paginate($request->all()));
    }

    public function store(StoreKycRequest $request): JsonResponse
    {
        return response()->json([
            'message' => 'KYC saved successfully.',
            'data' => $this->kycService->create($request->validated()),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => CustomerKyc::query()->with(['customer.company'])->findOrFail($id),
        ]);
    }

    public function update(StoreKycRequest $request, int $id): JsonResponse
    {
        $kyc = CustomerKyc::query()->findOrFail($id);
        $kyc->update($request->validated());

        return response()->json([
            'message' => 'KYC updated successfully.',
            'data' => $kyc->fresh(['customer.company']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        CustomerKyc::query()->findOrFail($id)->delete();

        return response()->json([
            'message' => 'KYC deleted successfully.',
        ]);
    }
}
