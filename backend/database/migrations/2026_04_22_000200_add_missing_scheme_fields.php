<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schemes', function (Blueprint $table) {
            $table->text('description')->nullable()->after('code');
            $table->string('late_fee_type', 20)->default('percentage')->after('late_fee_effect_account');
            $table->decimal('late_fee_value', 10, 2)->default(0)->after('late_fee_type');
            $table->integer('max_installments')->nullable()->after('total_installments');
        });
    }

    public function down(): void
    {
        Schema::table('schemes', function (Blueprint $table) {
            $table->dropColumn(['description', 'late_fee_type', 'late_fee_value', 'max_installments']);
        });
    }
};
