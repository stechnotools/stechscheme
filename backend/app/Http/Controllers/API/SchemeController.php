<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Scheme\StoreSchemeRequest;
use App\Models\ChartOfAccount;
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
        $scheme = $this->schemeService->create($request->validated());

        return response()->json([
            'message' => 'Scheme created successfully.',
            'scheme_id' => $scheme->id,
            'data' => $scheme,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => Scheme::query()->with(['maturityBenefits', 'memberships'])->findOrFail($id),
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
        $scheme = Scheme::query()->findOrFail($id);

        ChartOfAccount::query()
            ->where('source_type', 'scheme')
            ->where('source_id', $scheme->id)
            ->delete();

        $scheme->delete();

        return response()->json([
            'message' => 'Scheme deleted successfully.',
        ]);
    }
}
