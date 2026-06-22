<?php

namespace App\Services;

use App\Models\CommissionType;
use App\Models\Membership;
use App\Models\SalesmanCommission;

class CommissionService
{
    public function __construct(
        private readonly CommissionRuleResolverService $resolver
    ) {
    }

    /**
     * Record commission for a newly created membership enrollment.
     * Base amount is the first payment made at enrollment time, if any
     * (FIXED-type rules still pay out even when the base amount is zero).
     */
    public function recordForEnrollment(Membership $membership, float $baseAmount = 0.0): ?SalesmanCommission
    {
        return $this->record($membership, 'ENROLLMENT', 'membership', (int) $membership->id, $baseAmount);
    }

    /**
     * Record commission for a collection/installment payment receipt.
     */
    public function recordForCollection(Membership $membership, int $receiptId, float $amount): ?SalesmanCommission
    {
        return $this->record($membership, 'COLLECTION', 'receipt', $receiptId, $amount);
    }

    /**
     * Backfill commission for everything a salesman has enrolled/collected so
     * far, skipping anything already recorded (e.g. via the "Generate
     * Commission" button on the Salesman Detail page — used because scheme
     * openings imported via CSV intentionally skip auto-calculation).
     *
     * @return array{enrollment_created: int, collection_created: int}
     */
    public function generateForSalesman(int $salesmanId): array
    {
        $enrollmentCreated = 0;
        $collectionCreated = 0;

        Membership::query()
            ->with('scheme')
            ->where('user_id', $salesmanId)
            ->each(function (Membership $membership) use (&$enrollmentCreated, &$collectionCreated) {
                $before = SalesmanCommission::query()
                    ->where('event_type', 'enrollment')
                    ->where('source_type', 'membership')
                    ->where('source_id', $membership->id)
                    ->exists();

                if (! $before && $this->recordForEnrollment($membership, (float) ($membership->scheme?->installment_value ?? 0))) {
                    $enrollmentCreated++;
                }

                $receiptIds = $membership->payments()
                    ->whereNotNull('receipt_id')
                    ->distinct()
                    ->pluck('receipt_id');

                foreach ($receiptIds as $receiptId) {
                    $exists = SalesmanCommission::query()
                        ->where('event_type', 'collection')
                        ->where('source_type', 'receipt')
                        ->where('source_id', $receiptId)
                        ->exists();

                    if ($exists) {
                        continue;
                    }

                    $receiptTotal = (float) $membership->payments()
                        ->where('receipt_id', $receiptId)
                        ->sum('amount');

                    if ($this->recordForCollection($membership, (int) $receiptId, $receiptTotal)) {
                        $collectionCreated++;
                    }
                }
            });

        return [
            'enrollment_created' => $enrollmentCreated,
            'collection_created' => $collectionCreated,
        ];
    }

    private function record(Membership $membership, string $typeCode, string $sourceType, int $sourceId, float $baseAmount): ?SalesmanCommission
    {
        if (empty($membership->user_id)) {
            return null;
        }

        $eventType = strtolower($typeCode);

        $existing = SalesmanCommission::query()
            ->where('event_type', $eventType)
            ->where('source_type', $sourceType)
            ->where('source_id', $sourceId)
            ->first();

        if ($existing) {
            return $existing;
        }

        $commissionType = CommissionType::query()->where('code', $typeCode)->first();

        if (! $commissionType) {
            return null;
        }

        $resolved = $this->resolver->resolve((int) $membership->user_id, $commissionType->id, now());

        if (! $resolved) {
            return null;
        }

        $amount = $this->resolver->calculate($resolved, $baseAmount);

        if ($amount <= 0) {
            return null;
        }

        return SalesmanCommission::create([
            'salesman_id' => $membership->user_id,
            'customer_id' => $membership->customer_id,
            'scheme_id' => $membership->scheme_id,
            'membership_id' => $membership->id,
            'commission_type_id' => $commissionType->id,
            'event_type' => $eventType,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'rule_source' => $resolved['source'],
            'rule_id' => $resolved['rule']->id,
            'calculation_type' => $resolved['rule']->calculation_type,
            'base_amount' => $baseAmount,
            'commission_amount' => $amount,
            'status' => 'pending',
            'commission_date' => now()->toDateString(),
        ]);
    }
}
