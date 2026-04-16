<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('chart_of_accounts')
            ->where('account_type', 'Scheme')
            ->update(['account_type' => 'Liability']);
    }

    public function down(): void
    {
        DB::table('chart_of_accounts')
            ->where('source_type', 'scheme')
            ->where('account_type', 'Liability')
            ->update(['account_type' => 'Scheme']);
    }
};
