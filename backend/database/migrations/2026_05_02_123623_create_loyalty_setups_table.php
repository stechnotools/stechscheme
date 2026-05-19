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
        Schema::create('loyalty_setups', function (Blueprint $table) {
            $table->id();
            $table->string('setup_code')->unique();
            $table->string('setup_name');
            $table->string('status')->default('Active');
            $table->date('from_date')->nullable();
            $table->date('to_date')->nullable();
            
            // General Info
            $table->string('loyalty_program')->nullable();
            $table->string('currency')->default('INR');
            $table->string('rounding_method')->default('Nearest');
            $table->text('description')->nullable();
            $table->boolean('enable_loyalty_program')->default(true);
            $table->boolean('allow_earn_points')->default(true);
            $table->boolean('allow_redeem_points')->default(true);
            $table->boolean('allow_expiry')->default(false);
            $table->integer('point_expiry_months')->nullable();
            $table->string('point_calculation_on')->default('Net Amount');
            
            // Detailed Configs (JSON)
            $table->json('points_setup_overall')->nullable();
            $table->json('group_wise_points_setup')->nullable();
            $table->json('category_level_setup')->nullable();
            $table->json('redeem_benefits_setup')->nullable();
            $table->json('others_setup')->nullable();
            $table->text('notes')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loyalty_setups');
    }
};
