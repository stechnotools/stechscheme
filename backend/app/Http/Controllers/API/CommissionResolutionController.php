<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CommissionType;
use App\Services\CommissionRuleResolverService;
use App\Services\CommissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommissionResolutionController extends Controller
{
    public function __construct(
        private readonly CommissionRuleResolverService $resolver,
        private readonly CommissionService $commissionService
    ) {
    }

    /**
     * For each active commission type, show whether this salesman currently
     * resolves to their own override or falls back to the global rule.
     */
    public function forSalesman(Request $request, int $salesman): JsonResponse
    {
        $date = $request->filled('date') ? \Carbon\Carbon::parse($request->input('date')) : now();

        $data = CommissionType::query()
            ->where('status', 'active')
            ->get()
            ->map(function (CommissionType $type) use ($salesman, $date) {
                $resolved = $this->resolver->resolve($salesman, $type->id, $date);

                return [
                    'commission_type' => $type,
                    'rule_source' => $resolved['source'] ?? null,
                    'rule' => $resolved['rule'] ?? null,
                ];
            });

        return response()->json(['data' => $data]);
    }

    /**
     * Manually (re)generate commission for everything this salesman has
     * enrolled/collected so far. Idempotent — only fills in what's missing,
     * since enrollments imported via the Scheme Opening CSV flow
     * intentionally skip auto-calculation.
     */
    public function generate(int $salesman): JsonResponse
    {
        $result = $this->commissionService->generateForSalesman($salesman);

        return response()->json([
            'message' => "Generated {$result['enrollment_created']} enrollment and {$result['collection_created']} collection commission entr" .
                (($result['enrollment_created'] + $result['collection_created']) === 1 ? 'y' : 'ies') . '.',
            'data' => $result,
        ]);
    }
}
