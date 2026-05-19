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
            $table->boolean('allow_introducer_points')->default(false)->after('points_to_be_earned_wt_global');
            $table->json('introducer_benefit_setup')->nullable()->after('allow_introducer_points');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loyalty_setups', function (Blueprint $table) {
            $table->dropColumn(['allow_introducer_points', 'introducer_benefit_setup']);
        });
    }
};
