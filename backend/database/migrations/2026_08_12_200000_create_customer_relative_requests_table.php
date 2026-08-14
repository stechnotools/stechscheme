<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_relative_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('primary_customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('relative_customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('requested_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('pending');
            $table->text('notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->unique(['primary_customer_id', 'relative_customer_id'], 'customer_relative_requests_pair_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_relative_requests');
    }
};
