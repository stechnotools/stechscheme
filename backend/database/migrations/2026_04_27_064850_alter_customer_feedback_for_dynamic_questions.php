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
        Schema::table('customer_feedback', function (Blueprint $table) {
            $table->dropColumn(['rating_staff', 'rating_transparency', 'rating_overall']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customer_feedback', function (Blueprint $table) {
            $table->integer('rating_staff')->nullable();
            $table->integer('rating_transparency')->nullable();
            $table->integer('rating_overall')->nullable();
        });
    }
};
