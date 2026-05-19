<?php

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Customer;

$maxNo = Customer::query()
    ->whereRaw("loyalty_card_no ~ '^[0-9]+$' ")
    ->selectRaw("MAX(CAST(loyalty_card_no AS BIGINT)) as max_no")
    ->value('max_no');

echo "Max loyalty card no: " . ($maxNo ?: 'None') . "\n";

$customers = Customer::query()
    ->whereNotNull('loyalty_card_no')
    ->orderBy('loyalty_card_no', 'desc')
    ->limit(10)
    ->get();

echo "Top 10 loyalty card numbers:\n";
foreach ($customers as $customer) {
    echo "ID: {$customer->id}, Card No: {$customer->loyalty_card_no}\n";
}
