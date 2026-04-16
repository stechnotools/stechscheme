<?php

namespace Database\Seeders;

use App\Models\ChartOfAccount;
use App\Models\Scheme;
use Illuminate\Database\Seeder;

class SchemeChartOfAccountsSeeder extends Seeder
{
    public function run(): void
    {
        Scheme::query()
            ->select(['id', 'name', 'code', 'is_closed', 'remarks'])
            ->orderBy('id')
            ->chunkById(200, function ($schemes) {
                foreach ($schemes as $scheme) {
                    $schemeName = trim((string) $scheme->name);

                    if ($schemeName === '') {
                        continue;
                    }

                    ChartOfAccount::query()->updateOrCreate(
                        [
                            'source_type' => 'scheme',
                            'source_id' => $scheme->id,
                        ],
                        [
                            'parent_id' => null,
                            'name' => $schemeName,
                            'code' => $scheme->code ?: null,
                            'account_type' => 'Liability',
                            'is_active' => ! (bool) ($scheme->is_closed ?? false),
                            'remarks' => $scheme->remarks,
                        ]
                    );
                }
            });
    }
}
