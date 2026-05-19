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
        Schema::table('loyalty_sale_data', function (Blueprint $table) {
            $table->string('loyalty_card_no')->nullable()->after('mobile_no');
            $table->string('branch_name')->nullable()->after('vou_no');
            $table->unsignedBigInteger('branch_id')->nullable()->after('branch_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loyalty_sale_data', function (Blueprint $table) {
            $table->dropColumn(['loyalty_card_no', 'branch_name', 'branch_id']);
        });
    }
};
