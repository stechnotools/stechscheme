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
        Schema::table('feedback_questions', function (Blueprint $table) {
            $table->boolean('ask_reason_if_no')->default(false);
        });

        Schema::table('feedback_answers', function (Blueprint $table) {
            $table->text('reason')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('feedback_questions', function (Blueprint $table) {
            $table->dropColumn('ask_reason_if_no');
        });

        Schema::table('feedback_answers', function (Blueprint $table) {
            $table->dropColumn('reason');
        });
    }
};
