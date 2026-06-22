<?php

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\BranchController;
use App\Http\Controllers\API\ChartOfAccountController;
use App\Http\Controllers\API\CommissionCalculatorController;
use App\Http\Controllers\API\CommissionResolutionController;
use App\Http\Controllers\API\CommissionRuleController;
use App\Http\Controllers\API\CommissionTypeController;
use App\Http\Controllers\API\SalesmanCommissionController;
use App\Http\Controllers\API\SalesmanCommissionOverrideController;
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
use App\Http\Controllers\API\SalesmanController;
use App\Http\Controllers\VoucherSetupController;
use App\Http\Controllers\MetalBuyingOptionController;
use App\Http\Controllers\MetalRedeemOptionController;
use App\Http\Controllers\API\SchemeController;
use App\Http\Controllers\API\SchemeMaturityBenefitController;
use App\Http\Controllers\API\SettingController;
use App\Http\Controllers\API\TransactionController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\Api\FeedbackController;

use App\Http\Controllers\Api\DigitalMetalMasterController;
use App\Http\Controllers\Api\DigitalMetalSaleController;
use App\Http\Controllers\Api\DigitalMetalPurchaseController;
use App\Http\Controllers\Api\ActivityLogController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

Route::prefix('customer-auth')->group(function () {
    Route::post('login', [CustomerPortalAuthController::class, 'login']);
});

Route::post('feedback', [FeedbackController::class, 'store']);

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });

    Route::get('reports/dashboard', [ReportController::class, 'dashboard'])
        ->middleware('role:super-admin,admin,cashier');


    
    Route::get('digital-metal-masters/logs', [DigitalMetalMasterController::class, 'getAllLogs']);
    Route::get('digital-metal-masters/{id}/logs', [DigitalMetalMasterController::class, 'getLogs']);
    Route::post('digital-metal-masters/bulk-rates', [DigitalMetalMasterController::class, 'bulkRateUpdate']);
    
    Route::get('activity-logs', [ActivityLogController::class, 'index']);
    
    Route::get('voucher-setup/logs', [VoucherSetupController::class, 'logs']);
    Route::get('voucher-setup', [VoucherSetupController::class, 'index']);
    Route::post('voucher-setup', [VoucherSetupController::class, 'store']);
    Route::put('voucher-setup/{id}', [VoucherSetupController::class, 'update']);
    Route::delete('voucher-setup/{id}', [VoucherSetupController::class, 'destroy']);

    Route::post('customers/{id}/regenerate-loyalty-card', [CustomerController::class, 'regenerateLoyaltyCard']);
    Route::get('customers/next-loyalty-card-no', [CustomerController::class, 'getNextLoyaltyCardNo']);

    Route::apiResources([
        'chart-of-accounts' => ChartOfAccountController::class,
        'branches' => BranchController::class,
        'salesmen' => SalesmanController::class,
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

        'digital-metal-masters' => DigitalMetalMasterController::class,
        'digital-metal-sales' => DigitalMetalSaleController::class,
        'digital-metal-purchases' => DigitalMetalPurchaseController::class,
        'metal-buying-options' => MetalBuyingOptionController::class,
        'metal-redeem-options' => MetalRedeemOptionController::class,
        'loyalty-programmes' => \App\Http\Controllers\LoyaltyProgrammeController::class,
    ]);

    Route::post('memberships/enroll', [MembershipController::class, 'enroll']);
    Route::post('payments/bulk', [PaymentController::class, 'storeBulk']);
    Route::delete('schemes/{scheme}/maturity-benefits', [SchemeController::class, 'deleteMaturityBenefits']);

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

    Route::get('loyalty-card-categories/logs', [\App\Http\Controllers\LoyaltyCardCategoryController::class, 'logs']);
    Route::apiResource('loyalty-card-categories', \App\Http\Controllers\LoyaltyCardCategoryController::class)
        ->middleware('role:super-admin,admin');

    Route::get('loyalty-setups/logs', [\App\Http\Controllers\LoyaltySetupController::class, 'logs']);
    Route::apiResource('loyalty-setups', \App\Http\Controllers\LoyaltySetupController::class)
        ->middleware('role:super-admin,admin');

    Route::get('settings/{section}', [SettingController::class, 'show'])
        ->middleware('role:super-admin,admin');
    Route::put('settings/{section}', [SettingController::class, 'update'])
        ->middleware('role:super-admin,admin');
    Route::post('settings/company-logo', [SettingController::class, 'uploadCompanyLogo'])
        ->middleware('role:super-admin,admin');

    Route::prefix('commission')->middleware('role:super-admin,admin')->group(function () {
        Route::apiResource('types', CommissionTypeController::class);
        Route::apiResource('global-rules', CommissionRuleController::class);
        Route::apiResource('salesman-overrides', SalesmanCommissionOverrideController::class);
        Route::get('rules/{salesman}', [CommissionResolutionController::class, 'forSalesman']);
        Route::post('generate/{salesman}', [CommissionResolutionController::class, 'generate']);
        Route::post('calculate', [CommissionCalculatorController::class, 'calculate']);
        Route::get('ledger', [SalesmanCommissionController::class, 'index']);
        Route::post('ledger/{id}/approve', [SalesmanCommissionController::class, 'approve']);
        Route::post('ledger/{id}/mark-paid', [SalesmanCommissionController::class, 'markPaid']);
        Route::post('ledger/bulk-mark-paid', [SalesmanCommissionController::class, 'bulkMarkPaid']);
    });

    // Feedback Management
    Route::prefix('feedback')->group(function () {
        Route::get('/', [FeedbackController::class, 'index']);
        Route::get('/stats', [FeedbackController::class, 'stats']);
        Route::get('/staff-performance', [FeedbackController::class, 'staffPerformance']);
        Route::post('/{id}/actions', [FeedbackController::class, 'addAction']);
    });
    
    Route::apiResource('feedback-questions', \App\Http\Controllers\Api\FeedbackQuestionController::class);

    // Loyalty Sale Import
    Route::post('loyalty-sale-import/validate', [\App\Http\Controllers\LoyaltySaleImportController::class, 'validateImport']);
    Route::post('loyalty-sale-import/validate-rows', [\App\Http\Controllers\LoyaltySaleImportController::class, 'validateRows']);
    Route::post('loyalty-sale-import/import-rows', [\App\Http\Controllers\LoyaltySaleImportController::class, 'importRows']);
    Route::post('loyalty-sale-import', [\App\Http\Controllers\LoyaltySaleImportController::class, 'import']);

    Route::post('loyalty-sale-import/process', [\App\Http\Controllers\LoyaltySaleImportController::class, 'process']);
    Route::get('loyalty-sale-import/batches', [\App\Http\Controllers\LoyaltySaleImportController::class, 'batches']);
    Route::get('loyalty-sale-import/batches/{batch_id}', [\App\Http\Controllers\LoyaltySaleImportController::class, 'batchDetails']);
    Route::delete('loyalty-sale-import/batches/{batch_id}', [\App\Http\Controllers\LoyaltySaleImportController::class, 'deleteBatch']);
    Route::post('loyalty-sale-import/records/bulk-delete', [\App\Http\Controllers\LoyaltySaleImportController::class, 'bulkDeleteRecords']);
    Route::get('loyalty-sale-import/records/{id}/logs', [\App\Http\Controllers\LoyaltySaleImportController::class, 'recordLogs']);
    Route::delete('loyalty-sale-import/records/{id}', [\App\Http\Controllers\LoyaltySaleImportController::class, 'deleteRecord']);
    Route::put('loyalty-sale-import/records/{id}', [\App\Http\Controllers\LoyaltySaleImportController::class, 'updateRecord']);

    // Scheme Opening Entry
    Route::get('scheme-openings', [\App\Http\Controllers\API\SchemeOpeningController::class, 'index']);
    Route::post('scheme-openings/validate', [\App\Http\Controllers\API\SchemeOpeningController::class, 'validateImport']);
    Route::post('scheme-openings/validate-rows', [\App\Http\Controllers\API\SchemeOpeningController::class, 'validateRows']);
    Route::post('scheme-openings/import-rows', [\App\Http\Controllers\API\SchemeOpeningController::class, 'importRows']);
    Route::post('scheme-openings/process', [\App\Http\Controllers\API\SchemeOpeningController::class, 'process']);
    Route::post('scheme-openings/process-background', [\App\Http\Controllers\API\SchemeOpeningController::class, 'processBackground']);
    Route::get('scheme-openings/batches', [\App\Http\Controllers\API\SchemeOpeningController::class, 'batches']);
    Route::get('scheme-openings/batches/{batch_id}', [\App\Http\Controllers\API\SchemeOpeningController::class, 'batchDetails']);
    Route::delete('scheme-openings/batches/{batch_id}', [\App\Http\Controllers\API\SchemeOpeningController::class, 'deleteBatch']);
    Route::post('scheme-openings/records', [\App\Http\Controllers\API\SchemeOpeningController::class, 'store']);
    Route::delete('scheme-openings/records/{id}', [\App\Http\Controllers\API\SchemeOpeningController::class, 'destroy']);
    Route::put('scheme-openings/records/{id}', [\App\Http\Controllers\API\SchemeOpeningController::class, 'update']);
    Route::post('scheme-openings/records/bulk-delete', [\App\Http\Controllers\API\SchemeOpeningController::class, 'bulkDelete']);


    Route::get('loyalty-point-adjustments', [\App\Http\Controllers\LoyaltyPointAdjustmentController::class, 'index']);
    Route::get('loyalty-point-adjustments/next-voucher-no', [\App\Http\Controllers\LoyaltyPointAdjustmentController::class, 'getNextVoucherNo']);
    Route::post('loyalty-point-adjustments', [\App\Http\Controllers\LoyaltyPointAdjustmentController::class, 'store']);
    Route::get('loyalty-point-adjustments/{voucher_no}', [\App\Http\Controllers\LoyaltyPointAdjustmentController::class, 'show'])->where('voucher_no', '.*');
    Route::put('loyalty-point-adjustments/{voucher_no}', [\App\Http\Controllers\LoyaltyPointAdjustmentController::class, 'update'])->where('voucher_no', '.*');
    Route::delete('loyalty-point-adjustments/{voucher_no}', [\App\Http\Controllers\LoyaltyPointAdjustmentController::class, 'destroy'])->where('voucher_no', '.*');

    Route::get('loyalty-reports/ledger', [\App\Http\Controllers\LoyaltyReportController::class, 'ledger']);
    Route::get('loyalty-reports/ledger/{id}', [\App\Http\Controllers\LoyaltyReportController::class, 'ledgerDetails']);
    Route::get('loyalty-reports/category-wise', [\App\Http\Controllers\LoyaltyReportController::class, 'categoryWise']);
    Route::get('loyalty-reports/gift-achiever', [\App\Http\Controllers\LoyaltyReportController::class, 'giftAchiever']);
    Route::post('loyalty-reports/gift-achiever/update-status', [\App\Http\Controllers\LoyaltyReportController::class, 'updateCustomerGiftStatus']);
    Route::post('loyalty-reports/sync-balances', [\App\Http\Controllers\LoyaltyReportController::class, 'recalculateBalances']);
});

Route::get('feedback-questions', [\App\Http\Controllers\Api\FeedbackQuestionController::class, 'index']); // Public access to fetch questions for kiosk

Route::get('/test-speed', function() { return 'Fast!'; });
