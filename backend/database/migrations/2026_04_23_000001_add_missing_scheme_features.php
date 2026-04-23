<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schemes', function (Blueprint $table) {
            $table->integer('free_installments')->default(0)->nullable()->after('total_installments');
            $table->decimal('closing_penalty', 5, 2)->default(0)->after('grace_days');
            $table->string('gold_rate_policy', 50)->default('closing_rate')->after('wt_booked_with_gst');
        });
    }

    public function down(): void
    {
        Schema::table('schemes', function (Blueprint $table) {
            $table->dropColumn(['free_installments', 'closing_penalty', 'gold_rate_policy']);
        });
    }
};
