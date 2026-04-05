<?php

namespace App\Services;

class PhonePeService
{
    public function createPaymentOrder(array $payload): array
    {
        return [
            'status' => 'created',
            'gateway' => 'phonepe',
            'payload' => $payload,
        ];
    }
}
