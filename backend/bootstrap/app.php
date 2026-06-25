<?php

use App\Console\Commands\CheckGoldRateAlerts;
use App\Console\Commands\SendInstallmentReminders;
use App\Console\Commands\SendSchemeMaturityAlerts;
use App\Http\Middleware\BlockBotRequests;
use App\Http\Middleware\EnsureCustomerPortalToken;
use App\Http\Middleware\EnsureMobileVerified;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
        $middleware->append(BlockBotRequests::class);

        $middleware->alias([
            'mobile.verified' => EnsureMobileVerified::class,
            'role' => RoleMiddleware::class,
            'customer-portal-token' => EnsureCustomerPortalToken::class,
        ]);
    })
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command(SendInstallmentReminders::class)->dailyAt('09:00');
        $schedule->command(CheckGoldRateAlerts::class)->hourly();
        $schedule->command(SendSchemeMaturityAlerts::class)->dailyAt('09:30');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
