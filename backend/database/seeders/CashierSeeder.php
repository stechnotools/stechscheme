<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class CashierSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'cashier@jewelleryscheme.test'],
            [
                'name' => 'Demo Cashier',
                'mobile' => '9999999997',
                'password' => 'password123',
                'status' => 'active',
                'mobile_verified' => true,
                'mobile_verified_at' => now(),
            ]
        );

        $user->syncRoles(['cashier']);
    }
}
