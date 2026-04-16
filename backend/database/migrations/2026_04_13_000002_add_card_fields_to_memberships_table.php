<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('memberships', function (Blueprint $table) {
            $table->string('membership_no')->nullable()->after('scheme_id');
            $table->string('card_no')->nullable()->after('membership_no');
            $table->string('card_reference')->nullable()->after('card_no');
            $table->timestamp('card_issued_at')->nullable()->after('card_reference');
        });
    }

    public function down(): void
    {
        Schema::table('memberships', function (Blueprint $table) {
            $table->dropColumn(['membership_no', 'card_no', 'card_reference', 'card_issued_at']);
        });
    }
};
