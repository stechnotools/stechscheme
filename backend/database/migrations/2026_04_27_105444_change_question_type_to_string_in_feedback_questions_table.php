<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop the Postgres check constraint created by the enum
        DB::statement('ALTER TABLE feedback_questions DROP CONSTRAINT IF EXISTS feedback_questions_question_type_check');
        
        // Change the column type to string
        DB::statement('ALTER TABLE feedback_questions ALTER COLUMN question_type TYPE VARCHAR(255)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We can't easily go back to the exact enum state without knowing the old types,
        // but we can at least keep it as string.
    }
};
