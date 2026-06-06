<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Membership;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MembershipLifecycleService
{
    public function preview(Membership $membership, string $action): array
    {
        $membership = $this->loadMembership($membership);

        return $this->buildPayload($membership, $action);
    }

    public function apply(Membership $membership, string $action, ?User $actor = null, array $input = []): array
    {
        return DB::transaction(function () use ($membership, $action, $actor, $input) {
            $lockedMembership = Membership::query()
                ->with(['customer.kyc', 'user', 'scheme.maturityBenefits', 'installments', 'payments.installment'])
                ->whereKey($membership->id)
                ->lockForUpdate()
                ->firstOrFail();

            $payload = $this->buildPayload($lockedMembership, $action);
            $nextStatus = $this->resolveNextStatus($action, $input['status'] ?? null);

            $lockedMembership->update([
                'status' => $nextStatus,
            ]);

            ActivityLog::create([
                'user_id' => $actor?->id,
                'module' => 'Membership Lifecycle',
                'sub_module' => Str::headline($action),
                'action' => Str::upper($action),
                'description' => sprintf(
                    '%s membership %s moved to %s. Settlement: %s, Bonus: %s, Penalty: %s.',
                    $lockedMembership->membership_no ?: ('#' . $lockedMembership->id),
                    $lockedMembership->customer?->name ?: 'Unknown customer',
                    $nextStatus,
                    number_format((float) ($payload['summary']['net_settlement_amount'] ?? 0), 2, '.', ''),
                    number_format((float) ($payload['summary']['bonus_amount'] ?? 0), 2, '.', ''),
                    number_format((float) ($payload['summary']['closing_penalty_amount'] ?? 0), 2, '.', '')
                ),
                'metadata' => [
                    'membership_id' => $lockedMembership->id,
                    'membership_no' => $lockedMembership->membership_no,
                    'action' => $action,
                    'next_status' => $nextStatus,
                    'summary' => $payload['summary'],
                    'notes' => $input['notes'] ?? null,
                ],
            ]);

            return $this->buildPayload(
                $lockedMembership->fresh(['customer.kyc', 'user', 'scheme.maturityBenefits', 'installments', 'payments.installment']),
                $action,
                $nextStatus
            );
        });
    }

    private function loadMembership(Membership $membership): Membership
    {
        return $membership->loadMissing(['customer.kyc', 'user', 'scheme.maturityBenefits', 'installments', 'payments.installment']);
    }

    private function buildPayload(Membership $membership, string $action, ?string $nextStatus = null): array
    {
        $summary = $this->summarize($membership, $action);

        return [
            'membership' => [
                'id' => $membership->id,
                'membership_no' => $membership->membership_no,
                'status' => $membership->status,
                'next_status' => $nextStatus ?? $this->resolveNextStatus($action, null),
                'customer' => [
                    'id' => $membership->customer?->id,
                    'name' => $membership->customer?->name,
                    'mobile' => $membership->customer?->mobile,
                ],
                'scheme' => [
                    'id' => $membership->scheme?->id,
                    'name' => $membership->scheme?->name,
                    'code' => $membership->scheme?->code,
                ],
            ],
            'summary' => $summary,
            'installments' => $membership->installments
                ->sortBy('installment_no')
                ->values()
                ->map(function ($installment) {
                    return [
                        'id' => $installment->id,
                        'installment_no' => $installment->installment_no,
                        'due_date' => optional($installment->due_date)->toDateString(),
                        'amount' => (float) $installment->amount,
                        'penalty' => (float) ($installment->penalty ?? 0),
                        'paid_amount' => (float) ($installment->paid_amount ?? 0),
                        'balance_amount' => (float) ($installment->balance_amount ?? 0),
                        'paid' => (bool) $installment->paid,
                        'status' => $installment->status,
                        'overdue' => ! $installment->paid && $installment->due_date && Carbon::parse($installment->due_date)->lt(now()),
                    ];
                })
                ->all(),
        ];
    }

    private function summarize(Membership $membership, string $action): array
    {
        $installments = $membership->installments->sortBy('installment_no')->values();
        $today = Carbon::today();

        $principalTotal = round($installments->sum(fn ($installment) => (float) $installment->amount), 2);
        $penaltyTotal = round($installments->sum(fn ($installment) => (float) ($installment->penalty ?? 0)), 2);
        $paidTotal = round($installments->sum(fn ($installment) => (float) ($installment->paid_amount ?? 0)), 2);

        $principalPaid = round($installments->sum(function ($installment) {
            return min((float) ($installment->paid_amount ?? 0), (float) $installment->amount);
        }), 2);

        $penaltyPaid = round($installments->sum(function ($installment) {
            $paidAmount = (float) ($installment->paid_amount ?? 0);
            $principalAmount = (float) $installment->amount;

            return max(0, $paidAmount - $principalAmount);
        }), 2);

        $principalOutstanding = round(max(0, $principalTotal - $principalPaid), 2);
        $penaltyOutstanding = round(max(0, $penaltyTotal - $penaltyPaid), 2);
        $paidInstallments = (int) $installments->where('paid', true)->count();
        $pendingInstallments = (int) $installments->count() - $paidInstallments;
        $overdueInstallments = (int) $installments->filter(function ($installment) use ($today) {
            return ! $installment->paid && $installment->due_date && Carbon::parse($installment->due_date)->lt($today);
        })->count();

        $bonusAmount = $this->resolveBonusAmount($membership, $principalTotal, $paidInstallments);
        $closingPenaltyAmount = $this->resolveClosingPenaltyAmount($membership, $action, $principalOutstanding);
        $netSettlementAmount = round($principalOutstanding + $penaltyOutstanding + $closingPenaltyAmount - $bonusAmount, 2);

        return [
            'action' => $action,
            'current_status' => $membership->status,
            'next_status' => $this->resolveNextStatus($action, null),
            'total_installments' => (int) $installments->count(),
            'paid_installments' => $paidInstallments,
            'pending_installments' => $pendingInstallments,
            'overdue_installments' => $overdueInstallments,
            'principal_total' => $principalTotal,
            'penalty_total' => $penaltyTotal,
            'paid_total' => $paidTotal,
            'principal_paid' => $principalPaid,
            'penalty_paid' => $penaltyPaid,
            'principal_outstanding' => $principalOutstanding,
            'penalty_outstanding' => $penaltyOutstanding,
            'bonus_amount' => $bonusAmount,
            'closing_penalty_amount' => $closingPenaltyAmount,
            'net_settlement_amount' => $netSettlementAmount,
            'customer_payable_amount' => max(0, $netSettlementAmount),
            'customer_receivable_amount' => max(0, round(0 - $netSettlementAmount, 2)),
            'maturity_due' => $membership->maturity_date ? Carbon::parse($membership->maturity_date)->lte($today) : false,
            'is_eligible_for_maturity' => ($membership->maturity_date ? Carbon::parse($membership->maturity_date)->lte($today) : false) || $pendingInstallments === 0,
        ];
    }

    private function resolveBonusAmount(Membership $membership, float $principalTotal, int $paidInstallments): float
    {
        $scheme = $membership->scheme;

        if (! $scheme || ! $scheme->allow_bonus) {
            return 0.0;
        }

        $benefits = collect($scheme->maturityBenefits ?? []);
        if ($benefits->isNotEmpty()) {
            $benefit = $benefits->firstWhere('month', $paidInstallments)
                ?? $benefits->firstWhere('month', $membership->installments->count())
                ?? $benefits->sortByDesc('month')->first();

            if ($benefit) {
                $type = Str::lower(trim((string) ($benefit->type ?? 'value')));
                $value = (float) ($benefit->value ?? 0);

                if (Str::contains($type, ['percent', 'percentage', '%'])) {
                    return round(($principalTotal * $value) / 100, 2);
                }

                return round($value, 2);
            }
        }

        $bonusInstallments = max(0, (int) ($scheme->bonus_no_of_installments ?? 0));
        $installmentValue = (float) ($scheme->installment_value ?? 0);

        return round($bonusInstallments * $installmentValue, 2);
    }

    private function resolveClosingPenaltyAmount(Membership $membership, string $action, float $principalOutstanding): float
    {
        if (! in_array($action, ['close', 'cancel'], true)) {
            return 0.0;
        }

        $penaltyRate = (float) ($membership->scheme?->closing_penalty ?? 0);
        if ($penaltyRate <= 0) {
            return 0.0;
        }

        return round(($principalOutstanding * $penaltyRate) / 100, 2);
    }

    private function resolveNextStatus(string $action, ?string $overrideStatus): string
    {
        if (is_string($overrideStatus) && $overrideStatus !== '') {
            return strtolower($overrideStatus);
        }

        return match (strtolower($action)) {
            'mature', 'maturity' => 'matured',
            'redeem', 'redemption' => 'redeemed',
            'close', 'closure' => 'closed',
            'cancel', 'cancellation' => 'cancelled',
            'settle', 'settlement' => 'settled',
            default => throw new \InvalidArgumentException('Unsupported lifecycle action.'),
        };
    }
}
