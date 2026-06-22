<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\CommissionRuleResolverService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommissionCalculatorController extends Controller
{
    public function __construct(
        private readonly CommissionRuleResolverService $resolver
    ) {
    }

    /**
     * Dry-run commission calculation — does not write to the ledger.
     * Used by the admin UI to preview what a rule/override would pay out.
     */
    public function calculate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'salesman_id' => ['nullable', 'integer', 'exists:users,id'],
            'commission_type_id' => ['required', 'integer', 'exists:commission_types,id'],
            'base_amount' => ['required', 'numeric', 'min:0'],
            'date' => ['nullable', 'date'],
        ]);

        $date = isset($validated['date']) ? Carbon::parse($validated['date']) : now();

        $resolved = $this->resolver->resolve(
            $validated['salesman_id'] ?? null,
            $validated['commission_type_id'],
            $date
        );

        if (! $resolved) {
            return response()->json([
                'data' => [
                    'applicable' => false,
                    'commission_amount' => 0,
                ],
            ]);
        }

        $amount = $this->resolver->calculate($resolved, (float) $validated['base_amount']);

        return response()->json([
            'data' => [
                'applicable' => true,
                'rule_source' => $resolved['source'],
                'rule' => $resolved['rule'],
                'base_amount' => (float) $validated['base_amount'],
                'commission_amount' => $amount,
            ],
        ]);
    }
}
