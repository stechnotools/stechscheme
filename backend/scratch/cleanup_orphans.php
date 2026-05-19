<?php

use App\Models\LoyaltyLedger;
use App\Models\LoyaltySaleData;
use App\Models\Customer;
use Illuminate\Support\Facades\DB;

$orphans = LoyaltyLedger::where('reference_type', 'Import')
    ->whereNotExists(function ($query) {
        $query->select(DB::raw(1))
            ->from('loyalty_sale_data')
            ->whereColumn('loyalty_sale_data.vou_no', 'loyalty_ledgers.reference_id');
    })
    ->get();

echo "Found " . $orphans->count() . " orphaned ledger entries (no matching import record).\n";

foreach ($orphans as $orphan) {
    echo "Orphan: Ref {$orphan->reference_id} for Customer ID {$orphan->customer_id} (Points: {$orphan->points})\n";
    
    // Delete orphan
    $orphan->delete();
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
