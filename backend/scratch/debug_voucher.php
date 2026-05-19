<?php

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\LoyaltyLedger;
use App\Models\VoucherSetup;

// 1. Show all VoucherSetup
$setups = VoucherSetup::all();
echo "VOUCHER SETUPS:\n";
foreach ($setups as $s) {
    echo "ID: {$s->id}, Type: {$s->transaction_type}, Prefix: '{$s->prefix}', Start: {$s->start_no}\n";
}

// 2. Show recent LoyaltyLedger manual adjustments
echo "\nRECENT MANUAL ADJUSTMENTS:\n";
$ledgers = LoyaltyLedger::where('reference_type', 'Manual Adjustment')
    ->orderBy('id', 'desc')
    ->limit(10)
    ->get();

foreach ($ledgers as $l) {
    echo "ID: {$l->id}, Customer: {$l->customer_id}, Ref ID: '{$l->reference_id}', Date: {$l->transaction_date}\n";
}

// 3. Test getNextVoucherNo logic
$setup = VoucherSetup::where('transaction_type', 'Loyalty Card Redemption')
    ->orWhere('transaction_type', 'Loyalty Point Add/Redeem')
    ->first();

if ($setup) {
    echo "\nTESTING INCREMENT LOGIC for prefix '{$setup->prefix}':\n";
    $lastLedger = LoyaltyLedger::where(function($query) use ($setup) {
            $query->where('reference_id', 'like', $setup->prefix . '/%')
                  ->orWhere('reference_id', 'like', $setup->prefix . ' %');
        })
        ->orderBy('id', 'desc')
        ->first();

    if ($lastLedger) {
        echo "Found Last Ledger ID: {$lastLedger->id}, Ref ID: '{$lastLedger->reference_id}'\n";
        $parts = preg_split('/[\s\/]+/', $lastLedger->reference_id);
        echo "Preg Split Parts: " . json_encode($parts) . "\n";
        if (count($parts) > 1) {
            $lastNo = (int) $parts[1];
            $nextNo = max($setup->start_no, $lastNo + 1);
            echo "Last No parsed: $lastNo, Next No: $nextNo\n";
        } else {
            echo "Parts count <= 1\n";
        }
    } else {
        echo "No matching last ledger found\n";
    }
} else {
    echo "No matching setup found\n";
}
