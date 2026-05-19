<?php

use App\Models\Customer;
use App\Models\LoyaltyLedger;
use Illuminate\Support\Facades\DB;

$duplicates = LoyaltyLedger::select('customer_id', 'reference_id', 'points', 'transaction_type', DB::raw('COUNT(*) as count'), DB::raw('MIN(id) as keep_id'))
    ->where('reference_type', 'Import')
    ->groupBy('customer_id', 'reference_id', 'points', 'transaction_type')
    ->having(DB::raw('COUNT(*)'), '>', 1)
    ->get();

echo "Found " . $duplicates->count() . " sets of duplicate entries.\n";

foreach ($duplicates as $duplicate) {
    echo "Processing Reference: {$duplicate->reference_id} for Customer ID: {$duplicate->customer_id}\n";
    
    // Delete all except the one to keep
    $deleted = LoyaltyLedger::where('customer_id', $duplicate->customer_id)
        ->where('reference_id', $duplicate->reference_id)
        ->where('points', $duplicate->points)
        ->where('transaction_type', $duplicate->transaction_type)
        ->where('reference_type', 'Import')
        ->where('id', '!=', $duplicate->keep_id)
        ->delete();
        
    echo " - Deleted $deleted duplicate ledger entries.\n";
}

echo "\nTriggering balance recalculation...\n";
$customers = Customer::whereNotNull('loyalty_card_no')->get();
$updatedCount = 0;

foreach ($customers as $customer) {
    $stats = LoyaltyLedger::where('customer_id', $customer->id)
        ->select(
            DB::raw("SUM(CASE WHEN transaction_type IN ('Added', 'add', 'Credit') THEN points ELSE 0 END) as total_added"),
            DB::raw("SUM(CASE WHEN transaction_type IN ('Redeemed', 'redeem', 'Debit') THEN points ELSE 0 END) as total_redeemed")
        )
        ->first();

    $newBalance = ($stats->total_added ?? 0) - ($stats->total_redeemed ?? 0);
    $newLifetime = $stats->total_added ?? 0;

    if ($customer->loyalty_points_balance != $newBalance || $customer->lifetime_points != $newLifetime) {
        $customer->update([
            'loyalty_points_balance' => $newBalance,
            'lifetime_points' => $newLifetime
        ]);
        $updatedCount++;
    }
}

echo "Recalculation complete. Updated $updatedCount customers.\n";
