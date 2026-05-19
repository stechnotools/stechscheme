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
        Schema::create('loyalty_card_categories', function (Blueprint $table) {
            $table->id();
            $table->string('category_code')->unique();
            $table->string('category_name');
            $table->text('description')->nullable();
            $table->string('category_type')->default('Standard');
            $table->string('card_color')->nullable();
            $table->string('card_design')->nullable();
            $table->string('card_prefix')->nullable();
            $table->integer('card_number_length')->default(10);
            
            // Points & Benefits
            $table->string('earning_based_on')->default('Amount');
            $table->decimal('points_for_every', 15, 2)->default(0);
            $table->decimal('points_to_be_earned', 15, 2)->default(0);
            $table->decimal('min_points_to_redeem', 15, 2)->default(0);
            $table->integer('point_expiry_months')->default(12);
            
            // Status
            $table->string('status')->default('Active');
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->boolean('allow_downgrade')->default(true);
            $table->boolean('allow_upgrade')->default(true);
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loyalty_card_categories');
    }
};
