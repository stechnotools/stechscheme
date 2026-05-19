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
        Schema::table('loyalty_sale_data', function (Blueprint $table) {
            $table->string('introducer')->nullable()->after('loyalty_card_no');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loyalty_sale_data', function (Blueprint $table) {
            $table->dropColumn('introducer');
        });
    }
};
