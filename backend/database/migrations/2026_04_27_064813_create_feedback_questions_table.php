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
        Schema::create('feedback_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->nullable()->constrained('feedback_campaigns')->nullOnDelete();
            $table->string('question_text');
            $table->enum('question_type', ['rating_1_to_5', 'nps_0_to_10', 'text', 'yes_no', 'single_choice', 'multiple_choice']);
            $table->json('options')->nullable();
            $table->boolean('is_required')->default(true);
            $table->boolean('is_nps_driver')->default(false);
            $table->unsignedBigInteger('depends_on_question_id')->nullable();
            $table->string('depends_on_answer')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('depends_on_question_id')->references('id')->on('feedback_questions')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('feedback_questions');
    }
};
