<?php

namespace App\Services;

use App\Models\Otp;
use Illuminate\Support\Carbon;

class OtpService
{
    public function generate(string $mobile): Otp
    {
        return Otp::create([
            'mobile' => $mobile,
            'otp' => (string) random_int(100000, 999999),
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);
    }
}
