<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * PhonePe Standard Checkout v2 (OAuth-based) integration.
 *
 * IMPORTANT: endpoint paths below follow PhonePe's documented Standard Checkout
 * v2 flow as of this writing (OAuth client-credentials token, then a hosted
 * checkout order-creation call, then a server-to-server webhook). PhonePe's
 * API surface has changed across versions before — verify these exact paths
 * against PhonePe's current merchant integration docs against a sandbox
 * order before processing any real payment. This was NOT tested against a
 * real PhonePe sandbox in this session (no live credentials available) —
 * code-level correctness only, not yet sandbox-verified end-to-end.
 */
class PhonePeService
{
    private function baseUrl(): string
    {
        return $this->isProduction()
            ? 'https://api.phonepe.com/apis/pg'
            : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
    }

    private function oauthUrl(): string
    {
        return $this->isProduction()
            ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
            : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';
    }

    private function isProduction(): bool
    {
        return config('services.phonepe.env') === 'production';
    }

    private function isConfigured(): bool
    {
        return ! empty(config('services.phonepe.client_id')) && ! empty(config('services.phonepe.client_secret'));
    }

    /**
     * OAuth client-credentials token, cached for its lifetime minus a safety margin.
     */
    private function getAccessToken(): string
    {
        if (! $this->isConfigured()) {
            throw new \RuntimeException('PhonePe is not configured — set PHONEPE_CLIENT_ID/PHONEPE_CLIENT_SECRET.');
        }

        return Cache::remember('phonepe_access_token', 540, function () {
            $response = Http::asForm()->post($this->oauthUrl(), [
                'client_id' => config('services.phonepe.client_id'),
                'client_secret' => config('services.phonepe.client_secret'),
                'client_version' => config('services.phonepe.client_version'),
                'grant_type' => 'client_credentials',
            ]);

            if (! $response->successful()) {
                throw new \RuntimeException('PhonePe OAuth token request failed: ' . $response->body());
            }

            return $response->json('access_token');
        });
    }

    /**
     * Creates a hosted checkout order and returns the redirect URL the customer's
     * browser should be sent to. Amount must be in paise (integer).
     */
    public function createOrder(string $merchantOrderId, int $amountInPaise, string $redirectUrl): array
    {
        $response = Http::withToken($this->getAccessToken(), 'O-Bearer')
            ->post($this->baseUrl() . '/checkout/v2/pay', [
                'merchantOrderId' => $merchantOrderId,
                'amount' => $amountInPaise,
                'expireAfter' => 1200,
                'paymentFlow' => [
                    'type' => 'PG_CHECKOUT',
                    'merchantUrls' => [
                        'redirectUrl' => $redirectUrl,
                    ],
                ],
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException('PhonePe order creation failed: ' . $response->body());
        }

        return [
            'order_id' => $response->json('orderId'),
            'redirect_url' => $response->json('redirectUrl'),
        ];
    }

    public function checkOrderStatus(string $merchantOrderId): array
    {
        $response = Http::withToken($this->getAccessToken(), 'O-Bearer')
            ->get($this->baseUrl() . "/checkout/v2/order/{$merchantOrderId}/status");

        if (! $response->successful()) {
            throw new \RuntimeException('PhonePe status check failed: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * PhonePe signs webhook callbacks with Authorization: SHA256(username:password),
     * where username/password are configured in the PhonePe dashboard's webhook
     * settings (NOT the OAuth client credentials) — compare against our own hash.
     */
    public function verifyWebhookSignature(?string $authorizationHeader): bool
    {
        $username = config('services.phonepe.webhook_username');
        $password = config('services.phonepe.webhook_password');

        if (empty($authorizationHeader) || empty($username) || empty($password)) {
            return false;
        }

        $expected = hash('sha256', "{$username}:{$password}");

        return hash_equals($expected, $authorizationHeader);
    }
}
