<?php

use App\Models\ChartOfAccount;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        ChartOfAccount::query()
            ->where('source_type', 'scheme')
            ->whereNull('source_id')
            ->update([
                'source_type' => 'legacy_scheme',
                'is_active' => false,
                'remarks' => 'Legacy scheme ledger without source_id. Kept for audit history.',
            ]);
    }

    public function down(): void
    {
        ChartOfAccount::query()
            ->where('source_type', 'legacy_scheme')
            ->whereNull('source_id')
            ->update([
                'source_type' => 'scheme',
                'is_active' => true,
            ]);
    }
};
