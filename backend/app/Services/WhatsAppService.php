<?php

namespace App\Services;

class WhatsAppService
{
    public function sendOtp(string $mobile, string $otp): array
    {
        return [
            'mobile' => $mobile,
            'otp' => $otp,
            'status' => 'queued',
            'channel' => 'whatsapp',
        ];
    }

    public function sendMessage(string $mobile, string $message): array
    {
        return [
            'mobile' => $mobile,
            'message' => $message,
            'status' => 'queued',
            'channel' => 'whatsapp',
        ];
    }
}
