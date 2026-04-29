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
        Schema::create('digital_metal_masters', function (Blueprint $table) {
            $table->id();
            $table->string('metal_name');
            $table->string('purity')->nullable();
            $table->string('display_text')->nullable();
            $table->decimal('min_purchase_weight', 10, 4)->nullable();
            $table->decimal('min_purchase_amount', 15, 2)->nullable();
            $table->decimal('max_purchase_amount', 15, 2)->nullable();
            $table->decimal('rate_per', 10, 2)->nullable();
            $table->string('rate_per_unit')->nullable();
            $table->string('rate_per_display_text')->nullable();
            $table->string('rate_from')->default('Manual');
            $table->string('erp_metal_id')->nullable();
            $table->decimal('buy_markup_amount', 15, 2)->default(0);
            $table->decimal('sell_markup_amount', 15, 2)->default(0);
            $table->boolean('is_decimal_allow')->default(false);
            $table->string('status')->default('Active');
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('digital_metal_masters');
    }
};
