<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

// Block severe bot traffic immediately before booting Laravel
$botPaths = ['wp-login', 'wp-admin', 'wp-content', 'wp-includes', '.env', '.git', 'xmlrpc.php'];
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
foreach ($botPaths as $path) {
    if (stripos($requestUri, $path) !== false) {
        http_response_code(404);
        exit;
    }
}
// Also sever direct .php script executions other than index.php
if (preg_match('/\.php$/i', parse_url($requestUri, PHP_URL_PATH) ?? '') && stripos($requestUri, 'index.php') === false) {
    http_response_code(404);
    exit;
}

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
