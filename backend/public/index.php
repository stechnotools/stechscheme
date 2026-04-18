<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

error_log("BOOT_START: 0");

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

error_log("AUTOLOAD_START: " . (microtime(true) - LARAVEL_START));
// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

error_log("BOOTSTRAP_APP_START: " . (microtime(true) - LARAVEL_START));
// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

error_log("HANDLEREQUEST_START: " . (microtime(true) - LARAVEL_START));
$response = $app->handleRequest(Request::capture());
error_log("HANDLEREQUEST_END: " . (microtime(true) - LARAVEL_START));
return $response;
