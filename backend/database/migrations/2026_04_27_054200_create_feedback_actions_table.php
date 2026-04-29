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
        Schema::create('feedback_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('feedback_id')->constrained('customer_feedback')->onDelete('cascade');
            $table->foreignId('action_taken_by')->constrained('users')->onDelete('cascade');
            $table->enum('action_type', ['called_customer', 'offered_discount', 'apologized', 'rewarded', 'other']);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('feedback_actions');
    }
};
