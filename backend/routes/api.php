<?php

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\BranchController;
use App\Http\Controllers\API\ChartOfAccountController;
use App\Http\Controllers\API\CustomerController;
use App\Http\Controllers\API\CustomerPortalAuthController;
use App\Http\Controllers\API\CustomerPortalController;
use App\Http\Controllers\API\InstallmentController;
use App\Http\Controllers\API\KycController;
use App\Http\Controllers\API\MembershipController;
use App\Http\Controllers\API\PaymentController;
use App\Http\Controllers\API\PermissionController;
use App\Http\Controllers\API\ProductController;
use App\Http\Controllers\API\PromotionController;
use App\Http\Controllers\API\ReportController;
use App\Http\Controllers\API\RoleController;
use App\Http\Controllers\API\SchemeController;
use App\Http\Controllers\API\SchemeMaturityBenefitController;
use App\Http\Controllers\API\SettingController;
use App\Http\Controllers\API\TransactionController;
use App\Http\Controllers\API\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

Route::prefix('customer-auth')->group(function () {
    Route::post('login', [CustomerPortalAuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });

    Route::get('reports/dashboard', [ReportController::class, 'dashboard'])
        ->middleware('role:super-admin,admin');

    Route::apiResources([
        'chart-of-accounts' => ChartOfAccountController::class,
        'branches' => BranchController::class,
        'users' => UserController::class,
        'customers' => CustomerController::class,
        'kycs' => KycController::class,
        'schemes' => SchemeController::class,
        'scheme-maturity-benefits' => SchemeMaturityBenefitController::class,
        'memberships' => MembershipController::class,
        'installments' => InstallmentController::class,
        'payments' => PaymentController::class,
        'products' => ProductController::class,
        'promotions' => PromotionController::class,
        'transactions' => TransactionController::class,
    ]);

    Route::post('memberships/enroll', [MembershipController::class, 'enroll']);

    Route::prefix('customer-auth')->group(function () {
        Route::get('me', [CustomerPortalAuthController::class, 'me']);
        Route::post('logout', [CustomerPortalAuthController::class, 'logout']);
    });

    Route::prefix('customer-portal')->group(function () {
        Route::get('dashboard', [CustomerPortalController::class, 'dashboard']);
        Route::get('profile', [CustomerPortalController::class, 'profile']);
        Route::get('memberships', [CustomerPortalController::class, 'memberships']);
        Route::get('memberships/{membership}', [CustomerPortalController::class, 'showMembership']);
        Route::get('installments', [CustomerPortalController::class, 'installments']);
        Route::get('payments', [CustomerPortalController::class, 'payments']);
    });

    Route::apiResource('permissions', PermissionController::class)
        ->middleware('role:super-admin,admin');

    Route::apiResource('roles', RoleController::class)
        ->middleware('role:super-admin,admin');

    Route::get('settings/{section}', [SettingController::class, 'show'])
        ->middleware('role:super-admin,admin');
    Route::put('settings/{section}', [SettingController::class, 'update'])
        ->middleware('role:super-admin,admin');
    Route::post('settings/company-logo', [SettingController::class, 'uploadCompanyLogo'])
        ->middleware('role:super-admin,admin');
});

Route::get('/test-speed', function() { return 'Fast!'; });
