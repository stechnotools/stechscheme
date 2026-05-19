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
            $table->decimal('point_value', 10, 2)->default(1.00)->after('point_calculation_on');
            $table->decimal('min_redeem_points', 10, 2)->default(0.00)->after('point_value');
            $table->decimal('max_redeem_points_per_txn', 10, 2)->default(0.00)->after('min_redeem_points');
            $table->boolean('allow_partial_redemption')->default(true)->after('max_redeem_points_per_txn');
            $table->boolean('allow_redemption_on_discounted')->default(true)->after('allow_partial_redemption');
            $table->string('redemption_validation')->default('OTP')->after('allow_redemption_on_discounted');
            $table->json('excluded_categories')->nullable()->after('redemption_validation');
            $table->boolean('notify_on_credit')->default(true)->after('excluded_categories');
            $table->boolean('notify_on_redemption')->default(true)->after('notify_on_credit');
            $table->boolean('notify_before_expiry')->default(true)->after('notify_on_redemption');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loyalty_setups', function (Blueprint $table) {
            $table->dropColumn([
                'point_value',
                'min_redeem_points',
                'max_redeem_points_per_txn',
                'allow_partial_redemption',
                'allow_redemption_on_discounted',
                'redemption_validation',
                'excluded_categories',
                'notify_on_credit',
                'notify_on_redemption',
                'notify_before_expiry'
            ]);
        });
    }
};
