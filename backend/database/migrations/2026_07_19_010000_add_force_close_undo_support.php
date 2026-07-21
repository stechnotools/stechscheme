<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('memberships', function (Blueprint $table) {
            $table->string('previous_status')->nullable()->after('status');
        });

        Schema::table('vouchers', function (Blueprint $table) {
            $table->timestamp('reversed_at')->nullable()->after('narration');
            $table->foreignId('reversal_of_voucher_id')->nullable()->after('reversed_at')->constrained('vouchers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reversal_of_voucher_id');
            $table->dropColumn('reversed_at');
        });

        Schema::table('memberships', function (Blueprint $table) {
            $table->dropColumn('previous_status');
        });
    }
};
