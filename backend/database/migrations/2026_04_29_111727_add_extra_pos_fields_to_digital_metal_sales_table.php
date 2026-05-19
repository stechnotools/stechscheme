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
            $table->integer('pcs')->default(1)->after('weight');
            $table->decimal('other_charges', 15, 2)->default(0)->after('rate_per_gm');
            $table->string('salesman')->nullable()->after('other_charges');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('digital_metal_sales', function (Blueprint $table) {
            $table->dropColumn(['pcs', 'other_charges', 'salesman']);
        });
    }
};
