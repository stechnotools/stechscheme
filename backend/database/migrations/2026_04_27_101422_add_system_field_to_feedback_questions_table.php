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
            $table->string('system_field')->nullable()->after('depends_on_answer')->comment('mobile, name, comments, category, etc.');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('feedback_questions', function (Blueprint $table) {
            $table->dropColumn('system_field');
        });
    }
};
