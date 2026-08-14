<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Soft-deletes make a merge reversible: the duplicate Customer (and its
     * KYC row, if it was absorbed into the primary's) is hidden rather than
     * destroyed, so CustomerMergeService::undo() can bring it back.
     */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('customer_kycs', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('customer_kycs', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
