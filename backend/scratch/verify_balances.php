<?php
use App\Models\Customer;
$cardNos = ['1000000011', '1000000012', '1000000013'];
foreach(Customer::whereIn('loyalty_card_no', $cardNos)->get() as $c) {
    echo "Card: {$c->loyalty_card_no}, Balance: {$c->loyalty_points_balance}, Lifetime: {$c->lifetime_points}\n";
}
