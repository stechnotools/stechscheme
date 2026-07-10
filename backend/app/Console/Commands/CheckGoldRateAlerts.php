<?php

namespace App\Console\Commands;

use App\Models\GoldRateAlert;
use App\Services\PushNotificationService;
use Illuminate\Console\Command;

class CheckGoldRateAlerts extends Command
{
    protected $signature = 'alerts:gold-rate';

    protected $description = 'Push-notify customers whose gold rate alert threshold has been crossed';

    public function handle(PushNotificationService $pushNotificationService): int
    {
        $alerts = GoldRateAlert::with(['customer.user', 'digitalMetalMaster.lastLog'])
            ->where('triggered', false)
            ->get();

        $notified = 0;

        foreach ($alerts as $alert) {
            $master = $alert->digitalMetalMaster;
            if (! $master || ! $alert->customer?->user) {
                continue;
            }

            $ratePer = $master->lastLog ? (float) $master->lastLog->new_rate : (float) $master->rate_per;
            $sellMarkup = $master->lastLog ? (float) $master->lastLog->new_sell_markup : (float) $master->sell_markup_amount;
            $effectiveRate = $ratePer + $sellMarkup;
            $crossed = $alert->direction === 'above'
                ? $effectiveRate >= (float) $alert->target_rate
                : $effectiveRate <= (float) $alert->target_rate;

            if (! $crossed) {
                continue;
            }

            $pushNotificationService->sendToUser(
                $alert->customer->user,
                'Gold Rate Alert',
                "{$master->metal_name} {$master->purity} is now ₹{$effectiveRate}/{$master->rate_per_unit} — your target of ₹{$alert->target_rate} ({$alert->direction}) has been reached.",
                '/customer/panel/gold-rate',
            );

            $alert->update(['triggered' => true]);
            $notified++;
        }

        $this->info("Notified {$notified} customer(s) of crossed gold rate alerts.");

        return self::SUCCESS;
    }
}
