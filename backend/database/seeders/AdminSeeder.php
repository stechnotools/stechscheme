<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::firstOrCreate(
            ['email' => 'admin@jewelleryscheme.test'],
            [
                'name' => 'Default Jewellery Company',
                'phone' => '9999999999',
            ]
        );

        $user = User::firstOrCreate(
            ['email' => 'admin@jewelleryscheme.test'],
            [
                'company_id' => $company->id,
                'name' => 'System Admin',
                'mobile' => '9999999998',
                'password' => 'password123',
                'status' => 'active',
                'mobile_verified' => true,
                'mobile_verified_at' => now(),
            ]
        );

        if (! $user->hasRole('admin')) {
            $user->assignRole('admin');
        }
    }
}
