<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schemes', function (Blueprint $table) {
            // Lock-in Period
            $table->unsignedInteger('lock_in_period_months')->default(0)->after('closing_penalty');

            // Statutory Redemption Window
            $table->unsignedInteger('redemption_window_days')->default(365)->after('lock_in_period_months');

            // Booking Purity (for Weight schemes)
            $table->string('booking_purity')->nullable()->after('redemption_window_days');

            // Making Charge (VA) Discount
            $table->boolean('allow_va_discount')->default(false)->after('booking_purity');
            $table->decimal('va_discount_percentage', 5, 2)->default(0)->after('allow_va_discount');

            // Scheme Banner Image
            $table->string('banner_image_path')->nullable()->after('va_discount_percentage');

            // Scheme Workflow / T&C HTML
            $table->longText('workflow_html')->nullable()->after('banner_image_path');
        });
    }

    public function down(): void
    {
        Schema::table('schemes', function (Blueprint $table) {
            $table->dropColumn([
                'lock_in_period_months',
                'redemption_window_days',
                'booking_purity',
                'allow_va_discount',
                'va_discount_percentage',
                'banner_image_path',
                'workflow_html',
            ]);
        });
    }
};
