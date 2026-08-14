<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Mobile numbers are legitimately shared by more than one Customer (e.g.
     * a husband and wife enrolled under one household mobile) — the old
     * UNIQUE index made that impossible and caused OneClickEnrollmentService
     * to silently overwrite one family member's record with the other's.
     * Kept as a plain (non-unique) index for search/lookup performance.
     */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique(['mobile']);
            $table->index('mobile');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['mobile']);
            $table->unique('mobile');
        });
    }
};
