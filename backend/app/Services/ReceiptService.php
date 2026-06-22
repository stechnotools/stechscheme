<?php

namespace App\Services;

use App\Models\Receipt;
use App\Models\ReceiptDetail;
use App\Models\ReceiptPayment;
use App\Models\Payment;
use App\Models\Installment;
use App\Models\Membership;
use App\Models\Voucher;
use App\Models\VoucherTransaction;
use App\Models\VoucherSetup;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReceiptService
{
    public function __construct(
        private readonly CommissionService $commissionService
    ) {
    }

    /**
     * Process payments and generate Receipt, Details, Payments, Vouchers and Transactions.
     */
    public function createReceipt(Membership $membership, array $installmentsData, array $paymentsPool, string $paymentDate, string $status = 'success', bool $skipCommission = false): Receipt
    {
        return DB::transaction(function () use ($membership, $installmentsData, $paymentsPool, $paymentDate, $status, $skipCommission) {
            $membership->loadMissing('customer', 'scheme', 'user.branches');

            $totalAmount = round((float) array_sum(array_column($paymentsPool, 'amount')), 2);

            if ($totalAmount <= 0) {
                abort(422, 'Receipt amount must be greater than zero.');
            }

            // 1. Create Receipt
            $receiptNo = $this->generateReceiptNo();
            $receipt = Receipt::create([
                'receipt_no' => $receiptNo,
                'branch_id' => $membership->user?->branches?->first()?->id,
                'customer_id' => $membership->customer_id,
                'total_amount' => $totalAmount,
                'payment_date' => $paymentDate,
                'receipt_date' => $paymentDate,
                'status' => strtoupper($status) === 'SUCCESS' ? 'ACTIVE' : strtoupper($status),
            ]);

            // 2. Create Receipt Payments
            foreach ($paymentsPool as $p) {
                ReceiptPayment::create([
                    'receipt_id' => $receipt->id,
                    'method' => $this->normalizePaymentMethod((string) ($p['gateway'] ?? $p['method'] ?? 'cash')),
                    'amount' => round((float) $p['amount'], 2),
                    'transaction_id' => $p['transaction_id'] ?? null,
                    'payment_date' => $paymentDate,
                ]);
            }

            // 3. Allocate payments sequentially to installments
            $remainingPaymentPool = $totalAmount;
            $principalCollected = 0.0;
            $lateFeeCollected = 0.0;
            
            // Query installments ordered by installment_no
            $installments = Installment::whereIn('id', array_column($installmentsData, 'id'))
                ->where('membership_id', $membership->id)
                ->orderBy('installment_no')
                ->lockForUpdate()
                ->get();

            if ($installments->isEmpty()) {
                abort(422, 'At least one valid installment is required for a receipt.');
            }

            foreach ($installments as $installment) {
                if ($remainingPaymentPool <= 0.001) break;

                $alreadyPaid = (float) $installment->paid_amount;
                $principalDue = max(0, (float) $installment->amount - min($alreadyPaid, (float) $installment->amount));
                $paidTowardLateFee = max(0, $alreadyPaid - (float) $installment->amount);
                $lateFeeDue = max(0, (float) ($installment->penalty ?? 0) - $paidTowardLateFee);

                $principalAllocation = min($principalDue, $remainingPaymentPool);
                $remainingPaymentPool = round($remainingPaymentPool - $principalAllocation, 2);

                $lateFeeAllocation = min($lateFeeDue, $remainingPaymentPool);
                $remainingPaymentPool = round($remainingPaymentPool - $lateFeeAllocation, 2);

                $allocation = round($principalAllocation + $lateFeeAllocation, 2);
                if ($allocation <= 0.001) continue;

                // Create Detail
                ReceiptDetail::create([
                    'receipt_id' => $receipt->id,
                    'installment_id' => $installment->id,
                    'amount' => $principalAllocation,
                    'late_fee' => $lateFeeAllocation,
                ]);

                $principalCollected += $principalAllocation;
                $lateFeeCollected += $lateFeeAllocation;

                // Update installment state
                $newPaidAmount = (float) $installment->paid_amount + $allocation;
                $newBalance = (float) $installment->amount + (float) ($installment->penalty ?? 0) - $newPaidAmount;
                $newStatus = $newBalance <= 0.001 ? 'PAID' : 'PARTIAL';

                $installment->update([
                    'paid_amount' => $newPaidAmount,
                    'balance_amount' => max(0, $newBalance),
                    'status' => $newStatus,
                    'paid' => $newStatus === 'PAID',
                    'paid_date' => $newStatus === 'PAID' ? $paymentDate : $installment->paid_date,
                ]);

                // Create legacy Payment records (one per installment link)
                // Determine appropriate gateway for this allocation from the pool
                $gateway = $paymentsPool[0]['gateway'] ?? 'cash';
                $transactionId = $paymentsPool[0]['transaction_id'] ?? null;

                Payment::create([
                    'receipt_id' => $receipt->id,
                    'membership_id' => $membership->id,
                    'installment_id' => $installment->id,
                    'amount' => $allocation,
                    'gateway' => $gateway,
                    'transaction_id' => $transactionId,
                    'payment_date' => $paymentDate,
                    'status' => $status,
                ]);
            }

            if ($remainingPaymentPool > 0.001) {
                abort(422, 'Receipt amount exceeds the selected installments and late fees.');
            }

            $detailsTotal = round($principalCollected + $lateFeeCollected, 2);
            if (abs($detailsTotal - $totalAmount) > 0.001) {
                abort(422, 'Receipt detail total must match payment total.');
            }

            // 4. Update membership total_paid
            $membership->update([
                'total_paid' => (float) $membership->payments()->where('status', 'success')->sum('amount'),
            ]);

            // 5. Create Voucher
            $voucherNo = $this->generateVoucherNo();
            $voucher = Voucher::create([
                'voucher_no' => $voucherNo,
                'receipt_id' => $receipt->id,
                'voucher_type' => 'RECEIPT',
                'voucher_date' => $paymentDate,
                'reference_table' => 'receipts',
                'reference_id' => $receipt->id,
                'narration' => "Receipt Voucher for Scheme collection. Receipt: {$receiptNo}, Membership: {$membership->membership_no}",
            ]);

            $ledgerService = app(AccountingLedgerService::class);

            // 6. Post Voucher Transactions (DR Assets, CR Customer Deposit Liability)
            // Debits
            foreach ($paymentsPool as $p) {
                $methodName = $this->normalizePaymentMethod((string) ($p['gateway'] ?? $p['method'] ?? 'cash'));
                $coa = $ledgerService->assetLedger($this->paymentLedgerName($methodName));

                VoucherTransaction::create([
                    'voucher_id' => $voucher->id,
                    'chart_of_account_id' => $coa->id,
                    'ledger' => $coa->name,
                    'DR' => round((float) $p['amount'], 2),
                    'CR' => 0,
                ]);
            }

            $scheme = $membership->scheme;
            $ledgerService->schemeLedger($scheme);
            $customerLedger = $ledgerService->customerDepositLedger($membership->customer);

            VoucherTransaction::create([
                'voucher_id' => $voucher->id,
                'chart_of_account_id' => $customerLedger->id,
                'ledger' => $customerLedger->name,
                'DR' => 0,
                'CR' => round($principalCollected, 2),
            ]);

            if ($lateFeeCollected > 0.001) {
                $lateFeeCoa = $ledgerService->incomeLedger('Late Fee Income');

                VoucherTransaction::create([
                    'voucher_id' => $voucher->id,
                    'chart_of_account_id' => $lateFeeCoa->id,
                    'ledger' => $lateFeeCoa->name,
                    'DR' => 0,
                    'CR' => round($lateFeeCollected, 2),
                ]);
            }

            if (! $skipCommission) {
                $this->commissionService->recordForCollection($membership, $receipt->id, $totalAmount);
            }

            return $receipt;
        });
    }

    private function normalizePaymentMethod(string $method): string
    {
        $method = Str::upper(trim($method));

        return match ($method) {
            'BANK_TRANSFER', 'BANK TRANSFER', 'NEFT', 'RTGS', 'IMPS', 'CHEQUE' => 'BANK',
            default => $method !== '' ? $method : 'CASH',
        };
    }

    private function paymentLedgerName(string $method): string
    {
        return match ($method) {
            'CASH' => 'Cash In Hand',
            'UPI' => 'UPI Collection',
            'CARD' => 'HDFC Bank',
            'BANK' => 'SBI Bank',
            default => $method,
        };
    }

    private function generateReceiptNo(): string
    {
        $lastReceipt = Receipt::orderBy('id', 'desc')->first();
        $nextNo = $lastReceipt ? $lastReceipt->id + 1 : 1;
        return 'RCPT' . str_pad((string)$nextNo, 6, '0', STR_PAD_LEFT);
    }

    private function generateVoucherNo(): string
    {
        $setup = VoucherSetup::firstOrCreate(
            ['transaction_type' => 'Gold Scheme Collection'],
            ['prefix' => 'RV', 'start_no' => 1]
        );

        $nextNo = $setup->start_no;
        $setup->increment('start_no');

        return $setup->prefix . str_pad((string)$nextNo, 6, '0', STR_PAD_LEFT);
    }
}
