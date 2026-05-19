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
            $table->string('customer_mobile')->nullable()->after('customer_id');
            $table->text('customer_address')->nullable()->after('customer_mobile');
            $table->foreignId('salesman_id')->nullable()->after('salesman')->constrained('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('digital_metal_sales', function (Blueprint $table) {
            $table->dropForeign(['salesman_id']);
            $table->dropColumn(['customer_mobile', 'customer_address', 'salesman_id']);
        });
    }
};
