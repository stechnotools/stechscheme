<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Scheme\StoreSchemeRequest;
use App\Models\Scheme;
use App\Services\SchemeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchemeController extends Controller
{
    public function __construct(private readonly SchemeService $schemeService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->schemeService->paginate($request->all()));
    }

    public function store(StoreSchemeRequest $request): JsonResponse
    {
        return response()->json([
            'message' => 'Scheme created successfully.',
            'data' => $this->schemeService->create($request->validated()),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => Scheme::query()->with(['company', 'maturityBenefits', 'memberships'])->findOrFail($id),
        ]);
    }

    public function update(StoreSchemeRequest $request, int $id): JsonResponse
    {
        $scheme = Scheme::query()->findOrFail($id);

        return response()->json([
            'message' => 'Scheme updated successfully.',
            'data' => $this->schemeService->update($scheme, $request->validated()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        Scheme::query()->findOrFail($id)->delete();

        return response()->json([
            'message' => 'Scheme deleted successfully.',
        ]);
    }
}
