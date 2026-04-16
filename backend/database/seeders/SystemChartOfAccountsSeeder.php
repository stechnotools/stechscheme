<?php

namespace Database\Seeders;

use App\Models\ChartOfAccount;
use Illuminate\Database\Seeder;

class SystemChartOfAccountsSeeder extends Seeder
{
    private const SYSTEM_ACCOUNTS = [
        [
            'name' => 'Interest Receivable A/C',
            'account_type' => 'Asset',
        ],
        [
            'name' => 'Late Fee Income A/C',
            'account_type' => 'Income',
        ],
        [
            'name' => 'Bonus Expense A/C',
            'account_type' => 'Expense',
        ],
    ];

    public function run(): void
    {
        foreach (self::SYSTEM_ACCOUNTS as $account) {
            $name = $account['name'];

            $exists = ChartOfAccount::query()
                ->where('name', $name)
                ->exists();

            if ($exists) {
                continue;
            }

            ChartOfAccount::query()->create([
                'parent_id' => null,
                'name' => $name,
                'code' => null,
                'account_type' => $account['account_type'],
                'is_active' => true,
                'source_type' => 'system',
                'source_id' => null,
                'remarks' => 'System seeded account',
            ]);
        }
    }
}
