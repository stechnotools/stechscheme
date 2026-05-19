<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== ALL CUSTOMERS ===\n";
$customers = App\Models\Customer::all(['id', 'name', 'loyalty_card_no', 'loyalty_points_balance']);
print_r($customers->toArray());
