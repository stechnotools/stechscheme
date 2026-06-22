<?php

namespace Database\Seeders;

use App\Models\CommissionType;
use Illuminate\Database\Seeder;

class CommissionTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['code' => 'ENROLLMENT', 'name' => 'Enrollment Commission'],
            ['code' => 'COLLECTION', 'name' => 'Collection Commission'],
        ];

        foreach ($types as $type) {
            CommissionType::query()->firstOrCreate(
                ['code' => $type['code']],
                ['name' => $type['name'], 'status' => 'active']
            );
        }
    }
}
