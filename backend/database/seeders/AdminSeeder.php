<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'admin@jewelleryscheme.test'],
            [
                'name' => 'System Admin',
                'mobile' => '9999999998',
                'password' => 'password123',
                'status' => 'active',
                'mobile_verified' => true,
                'mobile_verified_at' => now(),
            ]
        );

        $user->syncRoles(['super-admin']);
    }
}
