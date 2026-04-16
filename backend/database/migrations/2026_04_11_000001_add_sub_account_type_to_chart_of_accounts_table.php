<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->string('sub_account_type', 100)->nullable()->after('account_type');
            $table->index(['account_type', 'sub_account_type'], 'coa_account_subtype_index');
        });

        DB::table('chart_of_accounts')
            ->where('source_type', 'scheme')
            ->update(['sub_account_type' => 'Scheme Collection']);
    }

    public function down(): void
    {
        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->dropIndex('coa_account_subtype_index');
            $table->dropColumn('sub_account_type');
        });
    }
};
