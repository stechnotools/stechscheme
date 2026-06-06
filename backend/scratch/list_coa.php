<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\ChartOfAccount;
use App\Models\VoucherSetup;

echo "=== VOUCHER SETUPS ===\n";
foreach (VoucherSetup::all() as $setup) {
    echo "- ID: {$setup->id}, Type: {$setup->transaction_type}, Prefix: {$setup->prefix}, Start: {$setup->start_no}\n";
}

echo "\n=== CHART OF ACCOUNTS ===\n";
foreach (ChartOfAccount::all() as $coa) {
    echo "- ID: {$coa->id}, Name: '{$coa->name}', Type: '{$coa->account_type}', Source: '{$coa->source_type}' (ID: {$coa->source_id})\n";
}
