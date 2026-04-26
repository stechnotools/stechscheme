<?php

use Illuminate\Support\Facades\Route;

// Sever common automated bot scans (wp-admin, .php files)
Route::any('wp-admin/{any?}', function () { abort(404); })->where('any', '.*');
Route::any('{any}', function () { abort(404); })->where('any', '.*\.php$');

Route::get('/', function () {
    return view('welcome');
});
