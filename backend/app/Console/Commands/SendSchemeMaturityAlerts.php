<?php

namespace App\Console\Commands;

use App\Models\Membership;
use App\Services\PushNotificationService;
use Illuminate\Console\Command;

class SendSchemeMaturityAlerts extends Command
{
    protected $signature = 'alerts:scheme-maturity {--within=7 : Days ahead to alert before maturity}';

    protected $description = 'Push-notify customers whose scheme membership is approaching maturity';

    public function handle(PushNotificationService $pushNotificationService): int
    {
        $withinDays = (int) $this->option('within');

        $memberships = Membership::with(['customer.user', 'scheme'])
            ->where('status', 'active')
            ->whereBetween('maturity_date', [now()->toDateString(), now()->addDays($withinDays)->toDateString()])
            ->get()
            ->filter(fn (Membership $membership) => $membership->customer?->user !== null);

        $notified = 0;

        foreach ($memberships as $membership) {
            $daysLeft = now()->diffInDays($membership->maturity_date, false);

            $pushNotificationService->sendToUser(
                $membership->customer->user,
                'Scheme Maturity Approaching',
                "Your {$membership->scheme?->name} membership matures in {$daysLeft} day(s) — visit a branch to redeem your benefits.",
                "/customer/panel/memberships/{$membership->id}",
            );

            $notified++;
        }

        $this->info("Notified {$notified} customer(s) of approaching scheme maturity.");

        return self::SUCCESS;
    }
}
