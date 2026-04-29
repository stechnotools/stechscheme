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
        Schema::create('metal_rate_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('metal_master_id')->constrained('metal_masters')->onDelete('cascade');
            $table->decimal('old_rate', 10, 2)->nullable();
            $table->decimal('new_rate', 10, 2);
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('metal_rate_logs');
    }
};
