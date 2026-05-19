<?php

use App\Models\Customer;
use App\Models\LoyaltyLedger;

$cardNos = ['1000000011', '1000000012', '1000000013'];
$customers = Customer::whereIn('loyalty_card_no', $cardNos)->get();

foreach ($customers as $c) {
    echo "Customer: {$c->name} ({$c->loyalty_card_no})\n";
    $ledger = LoyaltyLedger::where('customer_id', $c->id)->get();
    foreach ($ledger as $l) {
        echo " - Ledger ID: {$l->id}, Ref: {$l->reference_id}, Type: {$l->transaction_type}, Points: {$l->points}, Description: {$l->description}\n";
    }
}
