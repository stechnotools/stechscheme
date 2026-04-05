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
        Schema::create('customer_kycs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();

            // Identity
            $table->string('aadhaar_number')->nullable();
            $table->string('pan_number')->nullable();

            // Files
            $table->string('aadhaar_file')->nullable();
            $table->string('pan_file')->nullable();
            $table->string('photo')->nullable();

            // Address
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('pincode')->nullable();

            // KYC Status
            $table->string('status')->default('pending'); // pending/approved/rejected
            $table->text('remarks')->nullable();
            $table->timestamp('verified_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_kycs');
    }
};
