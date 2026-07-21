<?php

namespace App\Services;

use App\Models\DigitalMetalMaster;
use App\Models\DigitalMetalMasterLog;
use App\Models\Membership;
use App\Models\SchemeMaturityBenefit;
use App\Models\Voucher;
use App\Models\VoucherSetup;
use App\Models\VoucherTransaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SchemeClosingService
{
    private const OPEN_STATUSES = ['active', 'paused'];

    public function __construct(
        private readonly AccountingLedgerService $ledgerService
    ) {
    }

    /**
     * Pure read: eligibility + the bonus and voucher lines that would be
     * posted, so the UI can always show something meaningful whether or not
     * the membership is actually ready to close.
     */
    public function evaluate(Membership $membership): array
    {
        $membership->loadMissing('scheme.maturityBenefits', 'customer', 'installments');

        $isFullyPaid = $membership->isFullyPaid();
        $remainingAmount = $membership->getRemainingPayableAmount();
        $maturityDate = Carbon::parse($membership->maturity_date);
        $isMaturedDateReached = $maturityDate->lte(Carbon::today());
        $isOpenStatus = in_array($membership->status, self::OPEN_STATUSES, true);

        $eligible = $isFullyPaid && $isMaturedDateReached && $isOpenStatus;

        $reasons = [];
        if (! $isOpenStatus) {
            $reasons[] = "Membership is already '{$membership->status}'.";
        }
        if (! $isFullyPaid) {
            $reasons[] = "Remaining payable amount is " . number_format($remainingAmount, 2) . '.';
        }
        if (! $isMaturedDateReached) {
            $reasons[] = 'Matures on ' . $maturityDate->toFormattedDateString() . '.';
        }

        $bonus = $this->resolveBonus($membership);
        $lines = $this->closingVoucherLines($membership, $bonus);

        return [
            'eligible' => $eligible,
            'current_status' => $membership->status,
            'is_fully_paid' => $isFullyPaid,
            'remaining_amount' => $remainingAmount,
            'maturity_date' => $maturityDate->toDateString(),
            'is_matured_date_reached' => $isMaturedDateReached,
            'reasons' => $reasons,
            'bonus' => $bonus,
            'entry_no' => $this->peekVoucherNo('Scheme Closing Entry', 'CV'),
            'narration' => $this->defaultClosingNarration($membership),
            'voucher_lines' => $lines,
        ];
    }

    public function closeMembership(Membership $membership, ?string $narration = null): Voucher
    {
        return DB::transaction(function () use ($membership, $narration) {
            $membership->loadMissing('scheme.maturityBenefits', 'customer', 'installments');

            $evaluation = $this->evaluate($membership);

            if (! $evaluation['eligible']) {
                abort(422, 'Membership is not eligible to close: ' . implode(' ', $evaluation['reasons']));
            }

            $voucherNo = $this->generateVoucherNo('Scheme Closing Entry', 'CV');
            $voucher = Voucher::create([
                'voucher_no' => $voucherNo,
                'voucher_type' => 'CLOSING',
                'voucher_date' => Carbon::today()->toDateString(),
                'reference_table' => 'memberships',
                'reference_id' => $membership->id,
                'narration' => $narration ?: $evaluation['narration'],
            ]);

            foreach ($evaluation['voucher_lines'] as $line) {
                VoucherTransaction::create([
                    'voucher_id' => $voucher->id,
                    'chart_of_account_id' => $line['chart_of_account_id'],
                    'ledger' => $line['ledger_name'],
                    'DR' => $line['debit'],
                    'CR' => $line['credit'],
                ]);
            }

            $membership->update(['status' => 'matured']);

            return $voucher;
        });
    }

    /**
     * Pure read: what a customer would receive if they force-close (exit
     * before completing installments / before maturity) right now.
     * - Payout = total_paid minus the scheme's closing_penalty%.
     * - Maturity bonus is forfeited unless the scheme's lock_in_period_months
     *   has already elapsed since the membership started.
     */
    public function evaluateForceClose(Membership $membership): array
    {
        $membership->loadMissing('scheme.maturityBenefits', 'customer', 'installments');

        $isOpenStatus = in_array($membership->status, self::OPEN_STATUSES, true);
        $totalPaid = (float) $membership->total_paid;

        $reasons = [];
        if (! $isOpenStatus) {
            $reasons[] = "Membership is already '{$membership->status}'.";
        }
        if ($totalPaid <= 0.001) {
            $reasons[] = 'No amount has been paid yet.';
        }

        $eligible = $isOpenStatus && $totalPaid > 0.001;

        $penaltyPercent = (float) $membership->schemeTerm('closing_penalty', 0);
        $penaltyAmount = round($totalPaid * ($penaltyPercent / 100), 2);
        $lockInMonths = (int) $membership->schemeTerm('lock_in_period_months', 0);
        $elapsedMonths = Carbon::parse($membership->start_date)->diffInMonths(Carbon::today());
        $lockInPassed = $elapsedMonths >= $lockInMonths;

        $bonus = $lockInPassed
            ? $this->resolveBonus($membership)
            : ['amount' => 0.0, 'source' => null, 'ledger_account' => null, 'detail' => "Forfeited — lock-in period ({$lockInMonths} months) not yet reached."];

        $payoutAmount = round($totalPaid - $penaltyAmount + $bonus['amount'], 2);
        $lines = $this->forceClosingVoucherLines($membership, $totalPaid, $penaltyAmount, $payoutAmount, $bonus);

        return [
            'eligible' => $eligible,
            'current_status' => $membership->status,
            'reasons' => $reasons,
            'total_paid' => $totalPaid,
            'penalty_percent' => $penaltyPercent,
            'penalty_amount' => $penaltyAmount,
            'lock_in_months' => $lockInMonths,
            'elapsed_months' => $elapsedMonths,
            'lock_in_passed' => $lockInPassed,
            'bonus' => $bonus,
            'payout_amount' => $payoutAmount,
            'entry_no' => $this->peekVoucherNo('Scheme Force Closing Entry', 'FCV'),
            'narration' => $this->defaultForceClosingNarration($membership, $penaltyPercent),
            'voucher_lines' => $lines,
        ];
    }

    public function forceCloseMembership(Membership $membership, ?string $narration = null): Voucher
    {
        return DB::transaction(function () use ($membership, $narration) {
            $membership->loadMissing('scheme.maturityBenefits', 'customer', 'installments');

            $evaluation = $this->evaluateForceClose($membership);

            if (! $evaluation['eligible']) {
                abort(422, 'Membership is not eligible to force-close: ' . implode(' ', $evaluation['reasons']));
            }

            $voucherNo = $this->generateVoucherNo('Scheme Force Closing Entry', 'FCV');
            $voucher = Voucher::create([
                'voucher_no' => $voucherNo,
                'voucher_type' => 'FORCE_CLOSING',
                'voucher_date' => Carbon::today()->toDateString(),
                'reference_table' => 'memberships',
                'reference_id' => $membership->id,
                'narration' => $narration ?: $evaluation['narration'],
            ]);

            foreach ($evaluation['voucher_lines'] as $line) {
                VoucherTransaction::create([
                    'voucher_id' => $voucher->id,
                    'chart_of_account_id' => $line['chart_of_account_id'],
                    'ledger' => $line['ledger_name'],
                    'DR' => $line['debit'],
                    'CR' => $line['credit'],
                ]);
            }

            $membership->update(['status' => 'closed', 'previous_status' => $membership->status]);

            return $voucher;
        });
    }

    /**
     * Reverse a force-close that was applied by mistake: posts a reversal
     * voucher with every original line's DR/CR swapped, marks the original
     * voucher as reversed (never deleted, for audit trail), and restores the
     * membership to the status it had right before the force-close.
     */
    public function undoForceClose(Membership $membership): Voucher
    {
        return DB::transaction(function () use ($membership) {
            if ($membership->status !== 'closed') {
                abort(422, "Membership is '{$membership->status}', not 'closed' — nothing to undo.");
            }

            $original = Voucher::query()
                ->where('reference_table', 'memberships')
                ->where('reference_id', $membership->id)
                ->where('voucher_type', 'FORCE_CLOSING')
                ->whereNull('reversed_at')
                ->with('transactions')
                ->latest('id')
                ->first();

            if (! $original) {
                abort(422, 'No force-close entry found to undo for this membership.');
            }

            $voucherNo = $this->generateVoucherNo('Scheme Force Closing Reversal', 'FCR');
            $reversal = Voucher::create([
                'voucher_no' => $voucherNo,
                'voucher_type' => 'FORCE_REVERSAL',
                'voucher_date' => Carbon::today()->toDateString(),
                'reference_table' => 'memberships',
                'reference_id' => $membership->id,
                'reversal_of_voucher_id' => $original->id,
                'narration' => "Reversal of {$original->voucher_no} — force closure undone for Membership: {$membership->membership_no}",
            ]);

            foreach ($original->transactions as $line) {
                VoucherTransaction::create([
                    'voucher_id' => $reversal->id,
                    'chart_of_account_id' => $line->chart_of_account_id,
                    'ledger' => $line->ledger,
                    'DR' => $line->CR,
                    'CR' => $line->DR,
                ]);
            }

            $original->update(['reversed_at' => now()]);

            $membership->update([
                'status' => $membership->previous_status ?: 'active',
                'previous_status' => null,
            ]);

            return $reversal;
        });
    }

    /**
     * Preview (and actual posting) lines for a normal maturity close: the
     * bonus is recognized as an expense and credited to the customer's
     * deposit liability (deferred — paid out later at redemption), the
     * principal itself was already posted at each payment receipt so it is
     * not re-touched here.
     */
    private function closingVoucherLines(Membership $membership, array $bonus): array
    {
        if ($bonus['amount'] <= 0.001) {
            return [];
        }

        $bonusLedger = $this->ledgerService->expenseLedger($membership->schemeTerm('bonus_effect_account') ?: 'Bonus Expense A/C');
        $customerLedger = $this->ledgerService->customerDepositLedger($membership->customer);
        $amount = round($bonus['amount'], 2);

        return [
            [
                'chart_of_account_id' => $bonusLedger->id,
                'ledger_name' => $bonusLedger->name,
                'ledger_code' => $bonusLedger->code,
                'debit' => $amount,
                'credit' => 0,
                'remarks' => 'Maturity bonus recognized',
            ],
            [
                'chart_of_account_id' => $customerLedger->id,
                'ledger_name' => $customerLedger->name,
                'ledger_code' => $customerLedger->code,
                'debit' => 0,
                'credit' => $amount,
                'remarks' => 'Bonus credited to customer, payable at redemption',
            ],
        ];
    }

    /**
     * Preview (and actual posting) lines for a force-close: the full
     * collected principal liability is zeroed, cash is paid out net of the
     * penalty (plus any bonus that survived the lock-in check), the penalty
     * is recognized as income, and any bonus is expensed.
     */
    private function forceClosingVoucherLines(Membership $membership, float $totalPaid, float $penaltyAmount, float $payoutAmount, array $bonus): array
    {
        $lines = [];

        $customerLedger = $this->ledgerService->customerDepositLedger($membership->customer);
        $lines[] = [
            'chart_of_account_id' => $customerLedger->id,
            'ledger_name' => $customerLedger->name,
            'ledger_code' => $customerLedger->code,
            'debit' => round($totalPaid, 2),
            'credit' => 0,
            'remarks' => 'Zero out collected principal liability',
        ];

        $cashLedger = $this->ledgerService->assetLedger('Cash In Hand');
        $lines[] = [
            'chart_of_account_id' => $cashLedger->id,
            'ledger_name' => $cashLedger->name,
            'ledger_code' => $cashLedger->code,
            'debit' => 0,
            'credit' => round($payoutAmount, 2),
            'remarks' => 'Cash paid out to customer',
        ];

        if ($penaltyAmount > 0.001) {
            $penaltyLedger = $this->ledgerService->incomeLedger('Closing Penalty Income');
            $lines[] = [
                'chart_of_account_id' => $penaltyLedger->id,
                'ledger_name' => $penaltyLedger->name,
                'ledger_code' => $penaltyLedger->code,
                'debit' => 0,
                'credit' => round($penaltyAmount, 2),
                'remarks' => 'Closing penalty retained as income',
            ];
        }

        if ($bonus['amount'] > 0.001) {
            $bonusLedger = $this->ledgerService->expenseLedger($membership->schemeTerm('bonus_effect_account') ?: 'Bonus Expense A/C');
            $lines[] = [
                'chart_of_account_id' => $bonusLedger->id,
                'ledger_name' => $bonusLedger->name,
                'ledger_code' => $bonusLedger->code,
                'debit' => round($bonus['amount'], 2),
                'credit' => 0,
                'remarks' => 'Maturity bonus paid out with settlement',
            ];
        }

        return $lines;
    }

    private function defaultClosingNarration(Membership $membership): string
    {
        return "Being the scheme {$membership->scheme->name} ({$membership->membership_no}) closed on maturity.";
    }

    private function defaultForceClosingNarration(Membership $membership, float $penaltyPercent): string
    {
        return "Being the scheme {$membership->scheme->name} ({$membership->membership_no}) force-closed before maturity, {$penaltyPercent}% closing penalty applied.";
    }

    /**
     * Resolve the maturity bonus per the scheme's configured bonus mode, as
     * locked in on the membership at enrollment (schemeTerm()) — never from
     * whatever the Scheme template currently says, so a later scheme edit
     * can't change what an already-enrolled customer is owed.
     * - benefit_type = 'Maturity Benefit': look up the SchemeMaturityBenefit
     *   tier whose `month` is the highest one reached by the paid
     *   installment count. (The tier table itself isn't locked per-membership
     *   — only whether/how the scheme evaluates bonuses is.)
     * - benefit_type = 'Regular' (or anything else): flat bonus of
     *   bonus_no_of_installments * installment_value.
     * benefit_mode = 'Weight' values are converted to currency using the
     * scheme's matched metal master's current rate.
     */
    private function resolveBonus(Membership $membership): array
    {
        $scheme = $membership->scheme;

        if (! $scheme || ! $membership->schemeTerm('allow_bonus', false)) {
            return ['amount' => 0.0, 'source' => null, 'ledger_account' => null, 'detail' => 'Bonus not enabled for this scheme.'];
        }

        $ledgerAccount = $membership->schemeTerm('bonus_effect_account') ?: 'Bonus Expense A/C';
        $paidInstallmentCount = $membership->installments->where('paid', true)->count();

        if ($membership->schemeTerm('benefit_type') === 'Maturity Benefit') {
            $tier = $scheme->maturityBenefits
                ->filter(fn (SchemeMaturityBenefit $benefit) => (int) $benefit->month <= $paidInstallmentCount)
                ->sortByDesc(fn (SchemeMaturityBenefit $benefit) => (int) $benefit->month)
                ->first();

            if (! $tier) {
                return ['amount' => 0.0, 'source' => 'maturity_benefit', 'ledger_account' => $ledgerAccount, 'detail' => 'No maturity benefit tier reached yet.'];
            }

            $rawValue = (float) $tier->value;
            $amount = $tier->type === 'percentage'
                ? round((float) $membership->total_paid * ($rawValue / 100), 2)
                : $this->toCurrency($rawValue, $membership);

            return [
                'amount' => $amount,
                'source' => 'maturity_benefit',
                'ledger_account' => $ledgerAccount,
                'detail' => "Tier: month {$tier->month}, type {$tier->type}, value {$rawValue}",
            ];
        }

        $bonusInstallments = (int) $membership->schemeTerm('bonus_no_of_installments', 0);
        if ($bonusInstallments <= 0) {
            return ['amount' => 0.0, 'source' => 'regular', 'ledger_account' => $ledgerAccount, 'detail' => 'No bonus installments configured.'];
        }

        $installmentValue = (float) $membership->schemeTerm('installment_value', 0);
        $amount = round($bonusInstallments * $installmentValue, 2);

        return [
            'amount' => $amount,
            'source' => 'regular',
            'ledger_account' => $ledgerAccount,
            'detail' => "{$bonusInstallments} bonus installment(s) x " . number_format($installmentValue, 2),
        ];
    }

    /**
     * Convert a Weight-mode benefit value (grams) into currency using the
     * scheme's matched metal master's current rate. Amount-mode values pass
     * through unchanged. benefit_mode/item_group are read from the
     * membership's locked scheme terms, not the live scheme.
     */
    private function toCurrency(float $value, Membership $membership): float
    {
        if ($membership->schemeTerm('benefit_mode') !== 'Weight') {
            return round($value, 2);
        }

        $itemGroup = trim((string) $membership->schemeTerm('item_group', ''));
        $metalMaster = DigitalMetalMaster::query()
            ->get()
            ->first(fn (DigitalMetalMaster $m) => trim(trim((string) $m->purity) . ' ' . $m->metal_name) === $itemGroup
                || $m->metal_name === $itemGroup
                || $m->display_text === $itemGroup);

        if (! $metalMaster) {
            return 0.0;
        }

        $rateLogs = DigitalMetalMasterLog::query()
            ->where('digital_metal_master_id', $metalMaster->id)
            ->orderBy('created_at')
            ->get(['new_rate', 'created_at']);

        $rate = null;
        $today = Carbon::today()->endOfDay();

        foreach ($rateLogs as $log) {
            if ($log->created_at->lte($today)) {
                $rate = (float) $log->new_rate;
            } else {
                break;
            }
        }

        $rate ??= (float) ($metalMaster->rate_per ?? 0);

        return round($value * $rate, 2);
    }

    /**
     * Read-only look at what the next voucher number would be, without
     * consuming it — actually incrementing happens only in
     * generateVoucherNo(), called at real close time.
     */
    private function peekVoucherNo(string $transactionType, string $prefix): string
    {
        $setup = VoucherSetup::firstOrCreate(
            ['transaction_type' => $transactionType],
            ['prefix' => $prefix, 'start_no' => 1]
        );

        return $setup->prefix . str_pad((string) $setup->start_no, 6, '0', STR_PAD_LEFT);
    }

    private function generateVoucherNo(string $transactionType, string $prefix): string
    {
        $setup = VoucherSetup::firstOrCreate(
            ['transaction_type' => $transactionType],
            ['prefix' => $prefix, 'start_no' => 1]
        );

        $nextNo = $setup->start_no;
        $setup->increment('start_no');

        return $setup->prefix . str_pad((string) $nextNo, 6, '0', STR_PAD_LEFT);
    }
}
