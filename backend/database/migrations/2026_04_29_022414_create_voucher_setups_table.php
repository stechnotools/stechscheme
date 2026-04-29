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
        Schema::create('voucher_setups', function (Blueprint $row) {
            $row->id();
            $row->string('transaction_type');
            $row->string('prefix')->nullable();
            $row->integer('start_no')->default(1);
            $row->foreignId('updated_by')->nullable()->constrained('users');
            $row->timestamps();
        });

        // Seed default values
        DB::table('voucher_setups')->insert([
            ['transaction_type' => 'Digital Gold Buy', 'prefix' => 'DGB', 'start_no' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['transaction_type' => 'Digital Gold Sell', 'prefix' => 'DGS', 'start_no' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['transaction_type' => 'Digital Gold Lease', 'prefix' => 'DGL', 'start_no' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('voucher_setups');
    }
};
