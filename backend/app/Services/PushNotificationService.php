<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\User;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class PushNotificationService
{
    public function subscribe(User $user, array $subscription): PushSubscription
    {
        return PushSubscription::updateOrCreate(
            ['user_id' => $user->id, 'endpoint' => $subscription['endpoint']],
            [
                'public_key' => $subscription['keys']['p256dh'] ?? null,
                'auth_token' => $subscription['keys']['auth'] ?? null,
                'content_encoding' => $subscription['contentEncoding'] ?? null,
            ],
        );
    }

    public function unsubscribe(User $user, string $endpoint): void
    {
        PushSubscription::where('user_id', $user->id)->where('endpoint', $endpoint)->delete();
    }

    public function hasActiveSubscription(User $user): bool
    {
        return PushSubscription::where('user_id', $user->id)->exists();
    }

    /**
     * Sends a push notification to every active subscription for the given user,
     * pruning any subscription the browser reports as expired/gone.
     */
    public function sendToUser(User $user, string $title, string $body, ?string $url = null): void
    {
        $publicKey = config('services.vapid.public_key');
        $privateKey = config('services.vapid.private_key');

        if (empty($publicKey) || empty($privateKey)) {
            // VAPID keys aren't configured yet — silently skip rather than throwing,
            // so push remains an optional channel until the real keys are deployed.
            return;
        }

        $subscriptions = PushSubscription::where('user_id', $user->id)->get();
        if ($subscriptions->isEmpty()) {
            return;
        }

        $webPush = new WebPush([
            'VAPID' => [
                'subject' => config('services.vapid.subject'),
                'publicKey' => $publicKey,
                'privateKey' => $privateKey,
            ],
        ]);

        $payload = json_encode(['title' => $title, 'body' => $body, 'url' => $url ?? '/customer/panel']);

        $queued = false;

        foreach ($subscriptions as $subscription) {
            try {
                $webPush->queueNotification(
                    Subscription::create([
                        'endpoint' => $subscription->endpoint,
                        'publicKey' => $subscription->public_key,
                        'authToken' => $subscription->auth_token,
                    ]),
                    $payload,
                );
                $queued = true;
            } catch (\Throwable $e) {
                // A single malformed subscription (bad key encoding, etc.) must never
                // abort the rest of the batch or bubble up into the calling job/request.
                report($e);
                PushSubscription::where('id', $subscription->id)->delete();
            }
        }

        if (!$queued) {
            return;
        }

        try {
            foreach ($webPush->flush() as $report) {
                if (!$report->isSuccess() && $report->isSubscriptionExpired()) {
                    PushSubscription::where('endpoint', $report->getEndpoint())->delete();
                }
            }
        } catch (\Throwable $e) {
            // The actual payload encryption happens lazily inside flush() — a single
            // malformed subscription's keys can throw mid-batch. Never let that
            // propagate into the calling job/request; the caller only cares that
            // push was attempted, not that every single device succeeded.
            report($e);
        }
    }
}
