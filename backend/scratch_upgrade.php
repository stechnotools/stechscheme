<?php
use App\Models\Customer;

$customer = Customer::where('loyalty_card_no', '1000000012')->first();
if ($customer) {
    $result = $customer->checkAndApplyLoyaltyUpgrade();
    echo "Result: " . json_encode($result) . "\n";
    echo "New Category: " . $customer->category . "\n";
} else {
    echo "Customer not found\n";
}
