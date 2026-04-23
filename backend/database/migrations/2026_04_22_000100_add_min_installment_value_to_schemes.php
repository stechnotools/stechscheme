<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schemes', function (Blueprint $table) {
            $table->decimal('min_installment_value', 12, 2)->default(0)->after('installment_value');
        });
    }

    public function down(): void
    {
        Schema::table('schemes', function (Blueprint $table) {
            $table->dropColumn('min_installment_value');
        });
    }
};
