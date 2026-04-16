<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chart_of_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('chart_of_accounts', 'sub_account_type')) {
                $table->dropIndex('coa_account_subtype_index');
                $table->dropColumn('sub_account_type');
            }

            $table->foreignId('parent_id')
                ->nullable()
                ->constrained('chart_of_accounts')
                ->nullOnDelete()
                ->after('account_type');

            $table->index(['company_id', 'parent_id']);
        });
    }

    public function down(): void
    {
        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->dropIndex(['company_id', 'parent_id']);
            $table->dropConstrainedForeignId('parent_id');

            $table->string('sub_account_type', 100)->nullable()->after('account_type');
            $table->index(['account_type', 'sub_account_type'], 'coa_account_subtype_index');
        });
    }
};
