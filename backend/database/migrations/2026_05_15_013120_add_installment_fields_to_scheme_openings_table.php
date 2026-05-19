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
        Schema::table('scheme_openings', function (Blueprint $table) {
            $table->decimal('installment_amount', 12, 2)->default(0)->after('total_amount');
            $table->integer('number_of_months')->default(0)->after('installment_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('scheme_openings', function (Blueprint $table) {
            $table->dropColumn(['installment_amount', 'number_of_months']);
        });
    }
};
