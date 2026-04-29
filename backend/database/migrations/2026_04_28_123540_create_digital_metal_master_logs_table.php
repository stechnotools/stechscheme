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
        Schema::create('digital_metal_master_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('digital_metal_master_id')->constrained('digital_metal_masters')->onDelete('cascade');
            $table->decimal('old_rate', 15, 2)->nullable();
            $table->decimal('new_rate', 15, 2)->nullable();
            $table->decimal('old_buy_markup', 15, 2)->nullable();
            $table->decimal('new_buy_markup', 15, 2)->nullable();
            $table->decimal('old_sell_markup', 15, 2)->nullable();
            $table->decimal('new_sell_markup', 15, 2)->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('digital_metal_master_logs');
    }
};
