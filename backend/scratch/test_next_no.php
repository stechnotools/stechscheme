<?php

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\CustomerService;

$service = app(CustomerService::class);
$reflection = new ReflectionClass($service);
$method = $reflection->getMethod('generateUniqueLoyaltyCardNo');
$method->setAccessible(true);
echo "Generated Next: " . $method->invoke($service) . "\n";
