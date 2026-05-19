<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('loyalty_setups', function (Blueprint $table) {
            $table->decimal('points_for_every_wt_global', 10, 3)->nullable()->after('notify_before_expiry');
            $table->decimal('points_to_be_earned_wt_global', 10, 2)->nullable()->after('points_for_every_wt_global');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loyalty_setups', function (Blueprint $table) {
            $table->dropColumn(['points_for_every_wt_global', 'points_to_be_earned_wt_global']);
        });
    }
};
