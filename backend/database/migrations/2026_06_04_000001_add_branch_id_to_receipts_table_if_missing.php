<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('receipts') || Schema::hasColumn('receipts', 'branch_id')) {
            return;
        }

        Schema::table('receipts', function (Blueprint $table) {
            $table->foreignId('branch_id')
                ->nullable()
                ->after('receipt_no')
                ->constrained('branches')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('receipts') || ! Schema::hasColumn('receipts', 'branch_id')) {
            return;
        }

        Schema::table('receipts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('branch_id');
        });
    }
};
