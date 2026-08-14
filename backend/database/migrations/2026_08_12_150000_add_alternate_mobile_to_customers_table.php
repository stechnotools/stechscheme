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
        Schema::table('customers', function (Blueprint $table) {
            // Second mobile number absorbed when merging two Customer records
            // that turn out to be the same person (see CustomerMergeService).
            $table->string('alternate_mobile')->nullable()->after('mobile');
            $table->index('alternate_mobile');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['alternate_mobile']);
            $table->dropColumn('alternate_mobile');
        });
    }
};
