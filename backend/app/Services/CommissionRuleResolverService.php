<?php

namespace App\Services;

use App\Models\CommissionRule;
use App\Models\CommissionRuleSlab;
use App\Models\SalesmanCommissionOverride;
use Carbon\CarbonInterface;

class CommissionRuleResolverService
{
    /**
     * Resolve the applicable commission rule for a salesman + commission type
     * on a given date. A salesman override always wins when active and
     * within its effective window; otherwise falls back to the matching
     * global commission_rules row. Returns null when nothing applies.
     *
     * @return array{source: 'override'|'global', rule: CommissionRule|SalesmanCommissionOverride}|null
     */
    public function resolve(?int $salesmanId, int $commissionTypeId, CarbonInterface $onDate): ?array
    {
        if ($salesmanId) {
            $override = SalesmanCommissionOverride::query()
                ->where('salesman_id', $salesmanId)
                ->where('commission_type_id', $commissionTypeId)
                ->where('is_active', true)
                ->where(fn ($q) => $q->whereNull('effective_from')->orWhereDate('effective_from', '<=', $onDate))
                ->where(fn ($q) => $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $onDate))
                ->orderBy('priority')
                ->first();

            if ($override) {
                return ['source' => 'override', 'rule' => $override];
            }
        }

        $global = CommissionRule::query()
            ->where('commission_type_id', $commissionTypeId)
            ->where('is_global', true)
            ->where('status', 'active')
            ->where(fn ($q) => $q->whereNull('effective_from')->orWhereDate('effective_from', '<=', $onDate))
            ->where(fn ($q) => $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $onDate))
            ->orderBy('priority')
            ->first();

        if ($global) {
            return ['source' => 'global', 'rule' => $global];
        }

        return null;
    }

    /**
     * Calculate the commission amount for a resolved rule against a base amount.
     */
    public function calculate(array $resolved, float $baseAmount): float
    {
        $rule = $resolved['rule'];
        $calculationType = $rule->calculation_type;

        if ($calculationType === 'FIXED') {
            return round((float) $rule->value, 2);
        }

        if ($calculationType === 'PERCENTAGE') {
            return round($baseAmount * (float) $rule->value / 100, 2);
        }

        if ($calculationType === 'SLAB') {
            $slab = CommissionRuleSlab::query()
                ->where('rule_type', $resolved['source'])
                ->where('rule_id', $rule->id)
                ->where('from_amount', '<=', $baseAmount)
                ->where(fn ($q) => $q->whereNull('to_amount')->orWhere('to_amount', '>=', $baseAmount))
                ->orderBy('from_amount', 'desc')
                ->first();

            if (! $slab) {
                return 0.0;
            }

            return $slab->value_type === 'PERCENTAGE'
                ? round($baseAmount * (float) $slab->commission_value / 100, 2)
                : round((float) $slab->commission_value, 2);
        }

        return 0.0;
    }
}
