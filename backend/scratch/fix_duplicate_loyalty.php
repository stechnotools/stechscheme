<?php

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Customer;

$targetNo = '1000000002';
$customers = Customer::where('loyalty_card_no', $targetNo)->get();

echo "Found " . $customers->count() . " customers with card no $targetNo\n";
foreach ($customers as $customer) {
    echo "ID: {$customer->id}, Name: {$customer->name}, Mobile: {$customer->mobile}\n";
}

if ($customers->count() > 1) {
    echo "Fixing duplicates...\n";
    foreach ($customers->skip(1) as $customer) {
        $newNo = (string) random_int(1000000000, 9999999999);
        while (Customer::where('loyalty_card_no', $newNo)->exists()) {
            $newNo = (string) random_int(1000000000, 9999999999);
        }
        $customer->update(['loyalty_card_no' => $newNo]);
        echo "Updated Customer ID: {$customer->id} to new card no: $newNo\n";
    }
}
