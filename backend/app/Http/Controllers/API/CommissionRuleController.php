<?php

namespace App\Http\Controllers\API;

use App\Models\CommissionRule;
use App\Models\CommissionRuleSlab;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CommissionRuleController extends CrudController
{
    protected string $modelClass = CommissionRule::class;

    protected array $relations = ['commissionType', 'slabs'];

    protected array $filterable = ['commission_type_id', 'status'];

    protected array $sortable = ['id', 'priority', 'effective_from', 'effective_to', 'created_at', 'updated_at'];

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());

        $rule = DB::transaction(function () use ($validated) {
            $rule = CommissionRule::create($this->withoutSlabs($validated));
            $this->syncSlabs($rule->id, $validated['slabs'] ?? []);

            return $rule;
        });

        return response()->json([
            'message' => 'Commission rule created successfully.',
            'data' => $this->freshModel($rule),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $rule = CommissionRule::query()->findOrFail($id);
        $validated = $request->validate($this->rules($rule));

        DB::transaction(function () use ($rule, $validated) {
            $rule->update($this->withoutSlabs($validated));
            $this->syncSlabs($rule->id, $validated['slabs'] ?? []);
        });

        return response()->json([
            'message' => 'Commission rule updated successfully.',
            'data' => $this->freshModel($rule),
        ]);
    }

    /**
     * Historical rules must not be deleted — deactivate instead.
     */
    public function destroy(int $id): JsonResponse
    {
        $rule = CommissionRule::query()->findOrFail($id);
        $rule->update(['status' => 'inactive']);

        return response()->json([
            'message' => 'Commission rule deactivated.',
            'data' => $this->freshModel($rule),
        ]);
    }

    protected function rules(?Model $model = null): array
    {
        return [
            'commission_type_id' => ['required', 'integer', 'exists:commission_types,id'],
            'calculation_type' => ['required', Rule::in(['FIXED', 'PERCENTAGE', 'SLAB'])],
            'value' => ['nullable', 'numeric', 'min:0'],
            'priority' => ['nullable', 'integer', 'min:0'],
            'effective_from' => ['nullable', 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'slabs' => ['sometimes', 'array'],
            'slabs.*.from_amount' => ['required_with:slabs', 'numeric', 'min:0'],
            'slabs.*.to_amount' => ['nullable', 'numeric', 'gte:slabs.*.from_amount'],
            'slabs.*.value_type' => ['required_with:slabs', Rule::in(['FIXED', 'PERCENTAGE'])],
            'slabs.*.commission_value' => ['required_with:slabs', 'numeric', 'min:0'],
        ];
    }

    private function withoutSlabs(array $validated): array
    {
        unset($validated['slabs']);

        return $validated;
    }

    private function syncSlabs(int $ruleId, array $slabs): void
    {
        CommissionRuleSlab::query()
            ->where('rule_type', 'global')
            ->where('rule_id', $ruleId)
            ->delete();

        foreach ($slabs as $slab) {
            CommissionRuleSlab::create([
                'rule_type' => 'global',
                'rule_id' => $ruleId,
                'from_amount' => $slab['from_amount'],
                'to_amount' => $slab['to_amount'] ?? null,
                'value_type' => $slab['value_type'],
                'commission_value' => $slab['commission_value'],
            ]);
        }
    }
}
