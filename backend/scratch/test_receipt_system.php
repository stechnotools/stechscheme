<?php

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Customer;
use App\Models\CustomerKyc;
use App\Models\Scheme;
use App\Models\Membership;
use App\Models\Installment;
use App\Models\Receipt;
use App\Models\ReceiptDetail;
use App\Models\ReceiptPayment;
use App\Models\Payment;
use App\Models\Voucher;
use App\Models\VoucherTransaction;
use App\Models\ChartOfAccount;
use App\Services\MembershipService;
use App\Services\ReceiptService;
use Illuminate\Support\Facades\DB;

function assertEqual($expected, $actual, $message) {
    if ($expected == $actual) {
        echo "✅ PASS: {$message} (Value: {$actual})\n";
    } else {
        echo "❌ FAIL: {$message} | Expected: '{$expected}', Got: '{$actual}'\n";
    }
}

DB::transaction(function() {
    echo "=== RUNNING RECEIPT SYSTEM VERIFICATION TESTS ===\n\n";

    // 1. Setup Test Customer
    $customer = Customer::create([
        'name' => 'Test Khitish',
        'mobile' => '9999999999',
        'email' => 'khitish@example.com',
        'status' => 'active',
    ]);
    CustomerKyc::create([
        'customer_id' => $customer->id,
        'status' => 'approved',
    ]);

    // 2. Setup Test Scheme
    $scheme = Scheme::create([
        'name' => 'Swarna Laxmi Yojana',
        'code' => 'SLY01',
        'installment_value' => 1000,
        'total_installments' => 5,
        'status' => 'active',
    ]);

    // Create Scheme Chart of Account
    $schemeCoa = ChartOfAccount::create([
        'name' => 'Swarna Laxmi Yojana-Amount',
        'account_type' => 'Liability',
        'is_active' => true,
        'source_type' => 'scheme',
        'source_id' => $scheme->id,
    ]);

    // 3. Create Membership Subscription
    $user = \App\Models\User::first();
    $membershipService = app(MembershipService::class);
    $membership = $membershipService->createWithOptions([
        'customer_id' => $customer->id,
        'user_id' => $user ? $user->id : 1,
        'scheme_id' => $scheme->id,
        'start_date' => date('Y-m-d'),
        'status' => 'active',
    ], ['skip_kyc_check' => true]);

    assertEqual(5, $membership->installments()->count(), "5 Installments generated successfully");

    $installments = $membership->installments()->orderBy('installment_no')->get();

    // ==========================================
    // CASE 1: One Receipt -> Multiple Installments (Installments 1, 2, 3)
    // Paying ₹3000 using ₹2000 Cash, ₹1000 UPI
    // ==========================================
    echo "\n--- SIMULATING CASE 1: One Receipt -> Multiple Installments ---\n";

    $paymentPoolCase1 = [
        ['gateway' => 'cash', 'amount' => 2000.00],
        ['gateway' => 'upi', 'amount' => 1000.00]
    ];
    $installmentsDataCase1 = [
        ['id' => $installments[0]->id],
        ['id' => $installments[1]->id],
        ['id' => $installments[2]->id]
    ];

    $receiptService = app(ReceiptService::class);
    $receiptCase1 = $receiptService->createReceipt(
        $membership,
        $installmentsDataCase1,
        $paymentPoolCase1,
        date('Y-m-d')
    );

    // Assertions for Case 1
    assertEqual('RCPT000001', $receiptCase1->receipt_no, "Receipt Number generated as RCPT000001");
    assertEqual(3000.00, $receiptCase1->total_amount, "Receipt total amount is 3000.00");

    $details = ReceiptDetail::where('receipt_id', $receiptCase1->id)->get();
    assertEqual(3, $details->count(), "3 Receipt Details records created");
    foreach ($details as $detail) {
        assertEqual(1000.00, $detail->amount, "Receipt Detail amount matches installment amount (1000.00)");
    }

    $receiptPayments = ReceiptPayment::where('receipt_id', $receiptCase1->id)->get();
    assertEqual(2, $receiptPayments->count(), "2 Receipt Payment methods recorded");
    assertEqual('CASH', $receiptPayments[0]->method, "First method is CASH");
    assertEqual(2000.00, $receiptPayments[0]->amount, "First method amount is 2000.00");
    assertEqual('UPI', $receiptPayments[1]->method, "Second method is UPI");
    assertEqual(1000.00, $receiptPayments[1]->amount, "Second method amount is 1000.00");

    // Legacy Payments sync check
    $legacyPayments = Payment::where('receipt_id', $receiptCase1->id)->get();
    assertEqual(3, $legacyPayments->count(), "3 legacy payments created in payments table");

    // Installments status updates
    $inst1 = $installments[0]->fresh();
    $inst2 = $installments[1]->fresh();
    $inst3 = $installments[2]->fresh();

    assertEqual(1000.00, $inst1->paid_amount, "Installment 1 paid_amount is 1000.00");
    assertEqual(0.00, $inst1->balance_amount, "Installment 1 balance_amount is 0.00");
    assertEqual('PAID', $inst1->status, "Installment 1 status is PAID");
    assertEqual(true, $inst1->paid, "Installment 1 legacy paid flag is true");

    assertEqual(1000.00, $inst2->paid_amount, "Installment 2 paid_amount is 1000.00");
    assertEqual('PAID', $inst2->status, "Installment 2 status is PAID");

    assertEqual(1000.00, $inst3->paid_amount, "Installment 3 paid_amount is 1000.00");
    assertEqual('PAID', $inst3->status, "Installment 3 status is PAID");

    // Accounting Entry validation
    $voucher = Voucher::where('receipt_id', $receiptCase1->id)->first();
    assertEqual('RV000001', $voucher->voucher_no, "Voucher RV000001 created successfully");

    $txs = VoucherTransaction::where('voucher_id', $voucher->id)->orderBy('id')->get();
    assertEqual(3, $txs->count(), "3 Voucher Transaction splits posted");

    assertEqual('CASH Account', $txs[0]->ledger, "Voucher Transaction 1 debit ledger is CASH Account");
    assertEqual(2000.00, $txs[0]->DR, "Voucher Transaction 1 debit amount is 2000.00");
    assertEqual(0.00, $txs[0]->CR, "Voucher Transaction 1 credit amount is 0.00");

    assertEqual('UPI Account', $txs[1]->ledger, "Voucher Transaction 2 debit ledger is UPI Account");
    assertEqual(1000.00, $txs[1]->DR, "Voucher Transaction 2 debit amount is 1000.00");
    assertEqual(0.00, $txs[1]->CR, "Voucher Transaction 2 credit amount is 0.00");

    assertEqual('Swarna Laxmi Yojana-Amount', $txs[2]->ledger, "Voucher Transaction 3 credit ledger is Swarna Laxmi Yojana-Amount");
    assertEqual(0.00, $txs[2]->DR, "Voucher Transaction 3 debit amount is 0.00");
    assertEqual(3000.00, $txs[2]->CR, "Voucher Transaction 3 credit amount is 3000.00");


    // ==========================================
    // CASE 2: One Installment -> Partial Multiple Receipts (Installment 4)
    // Installment amount: ₹1000
    // Payment 1: ₹400 CASH
    // Payment 2: ₹600 UPI
    // ==========================================
    echo "\n--- SIMULATING CASE 2: One Installment -> Partial Multiple Receipts ---\n";

    $inst4 = $installments[3]->fresh();
    assertEqual('PENDING', $inst4->status, "Installment 4 initial status is PENDING");
    assertEqual(1000.00, $inst4->amount, "Installment 4 amount is 1000.00");
    assertEqual(0.00, $inst4->paid_amount, "Installment 4 paid_amount is 0.00");
    assertEqual(1000.00, $inst4->balance_amount, "Installment 4 balance_amount is 1000.00");

    // First Receipt: ₹400
    echo "--- Saving First Partial Receipt (₹400 CASH) ---\n";
    $receiptCase2_1 = $receiptService->createReceipt(
        $membership,
        [['id' => $inst4->id]],
        [['gateway' => 'cash', 'amount' => 400.00]],
        date('Y-m-d')
    );

    // Verify installment status after first payment
    $inst4 = $inst4->fresh();
    assertEqual(400.00, $inst4->paid_amount, "Installment 4 paid_amount is now 400.00");
    assertEqual(600.00, $inst4->balance_amount, "Installment 4 balance_amount is now 600.00");
    assertEqual('PARTIAL', $inst4->status, "Installment 4 status transitioned to PARTIAL");
    assertEqual(false, $inst4->paid, "Installment 4 legacy paid flag remains false");

    // Verify first voucher transaction
    $voucher2_1 = Voucher::where('receipt_id', $receiptCase2_1->id)->first();
    $txs2_1 = VoucherTransaction::where('voucher_id', $voucher2_1->id)->orderBy('id')->get();
    assertEqual(2, $txs2_1->count(), "2 Voucher Transaction splits posted for first partial payment");
    assertEqual('CASH Account', $txs2_1[0]->ledger, "Voucher Transaction 1 ledger is CASH Account");
    assertEqual(400.00, $txs2_1[0]->DR, "CASH Account debited with 400.00");
    assertEqual('Swarna Laxmi Yojana-Amount', $txs2_1[1]->ledger, "Voucher Transaction 2 ledger is Swarna Laxmi Yojana-Amount");
    assertEqual(400.00, $txs2_1[1]->CR, "Swarna Laxmi Yojana-Amount credited with 400.00");

    // Second Receipt: ₹600
    echo "--- Saving Second Partial Receipt (₹600 UPI) ---\n";
    $receiptCase2_2 = $receiptService->createReceipt(
        $membership,
        [['id' => $inst4->id]],
        [['gateway' => 'upi', 'amount' => 600.00]],
        date('Y-m-d')
    );

    // Verify installment status after second payment (Final Paid)
    $inst4 = $inst4->fresh();
    assertEqual(1000.00, $inst4->paid_amount, "Installment 4 paid_amount is now 1000.00");
    assertEqual(0.00, $inst4->balance_amount, "Installment 4 balance_amount is now 0.00");
    assertEqual('PAID', $inst4->status, "Installment 4 status transitioned to PAID");
    assertEqual(true, $inst4->paid, "Installment 4 legacy paid flag is now true");

    // Verify second voucher transaction
    $voucher2_2 = Voucher::where('receipt_id', $receiptCase2_2->id)->first();
    $txs2_2 = VoucherTransaction::where('voucher_id', $voucher2_2->id)->orderBy('id')->get();
    assertEqual(2, $txs2_2->count(), "2 Voucher Transaction splits posted for second partial payment");
    assertEqual('UPI Account', $txs2_2[0]->ledger, "Voucher Transaction 1 ledger is UPI Account");
    assertEqual(600.00, $txs2_2[0]->DR, "UPI Account debited with 600.00");
    assertEqual('Swarna Laxmi Yojana-Amount', $txs2_2[1]->ledger, "Voucher Transaction 2 ledger is Swarna Laxmi Yojana-Amount");
    assertEqual(600.00, $txs2_2[1]->CR, "Swarna Laxmi Yojana-Amount credited with 600.00");

    echo "\n=== ALL TESTS COMPLETED SUCCESSFULLY ===\n";
    
    // Rollback changes to keep the database completely clean
    throw new Exception("Rollback Exception to prevent cluttering the database.");
});

