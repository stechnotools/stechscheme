<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('customer_code')->nullable()->unique()->after('id');
        });

        // Backfill a random unique code for any existing customers so the
        // column can be relied on everywhere going forward.
        DB::table('customers')->whereNull('customer_code')->orderBy('id')->each(function ($customer) {
            do {
                $code = (string) random_int(100000, 999999);
            } while (DB::table('customers')->where('customer_code', $code)->exists());

            DB::table('customers')->where('id', $customer->id)->update(['customer_code' => $code]);
        });

        // Mobile is no longer required — the Scheme Opening CSV import allows
        // enrolling customers without a mobile number.
        Schema::table('customers', function (Blueprint $table) {
            $table->string('mobile')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('mobile')->nullable(false)->change();
            $table->dropColumn('customer_code');
        });
    }
};
