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
        Schema::create('metal_masters', function (Blueprint $table) {
            $table->id();
            $table->string('metal_name');
            $table->decimal('rate_per', 10, 2)->nullable();
            $table->string('rate_per_unit')->nullable();
            $table->string('rate_per_display_text')->nullable();
            $table->string('rate_from')->default('Manual');
            $table->string('erp_metal_id')->nullable();
            $table->string('group_name')->nullable();
            $table->string('display_text')->nullable();
            $table->boolean('show_in_dashboard')->default(true);
            $table->integer('sort_order')->nullable();
            $table->boolean('is_decimal_allow')->default(false);
            $table->decimal('booking_amount_percent', 5, 2)->nullable();
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
        Schema::dropIfExists('metal_masters');
    }
};
