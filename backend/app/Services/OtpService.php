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

    public function verify(string $mobile, string $otp): bool
    {
        $record = Otp::query()
            ->where('mobile', $mobile)
            ->where('otp', $otp)
            ->where('expires_at', '>', Carbon::now())
            ->whereNull('verified_at')
            ->latest('id')
            ->first();

        if (! $record) {
            return false;
        }

        $record->update(['verified_at' => Carbon::now()]);

        return true;
    }
}
