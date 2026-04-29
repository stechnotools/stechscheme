<?php

namespace App\Services;

class SmsService
{
    public function sendMessage(string $mobile, string $message): array
    {
        return [
            'mobile' => $mobile,
            'message' => $message,
            'status' => 'queued',
            'channel' => 'sms',
        ];
    }
}
