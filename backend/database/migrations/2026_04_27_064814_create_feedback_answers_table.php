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
        Schema::create('feedback_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('feedback_id')->constrained('customer_feedback')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('feedback_questions')->cascadeOnDelete();
            $table->text('answer_value')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('feedback_answers');
    }
};
