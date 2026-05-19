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
        Schema::table('digital_metal_sales', function (Blueprint $table) {
            $table->string('voucher_no')->nullable()->after('id');
            $table->date('voucher_date')->nullable()->after('voucher_no');
            $table->decimal('discount_amount', 15, 2)->default(0)->after('total_amount');
            $table->decimal('gst_amount', 15, 2)->default(0)->after('discount_amount');
            $table->json('payment_details')->nullable()->after('transaction_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('digital_metal_sales', function (Blueprint $table) {
            $table->dropColumn(['voucher_no', 'voucher_date', 'discount_amount', 'gst_amount', 'payment_details']);
        });
    }
};
