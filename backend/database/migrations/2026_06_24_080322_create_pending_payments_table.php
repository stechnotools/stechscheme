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
        Schema::create('pending_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('membership_id')->constrained('memberships')->onDelete('cascade');
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->json('installment_ids');
            $table->decimal('amount', 12, 2);
            // PhonePe's merchantOrderId — our own idempotency key, generated before calling PhonePe.
            $table->string('merchant_order_id')->unique();
            // PhonePe's own orderId, returned from the create-order call.
            $table->string('phonepe_order_id')->nullable();
            $table->enum('status', ['initiated', 'success', 'failed', 'expired'])->default('initiated');
            $table->foreignId('receipt_id')->nullable()->constrained('receipts')->onDelete('set null');
            $table->timestamps();

            $table->index('customer_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pending_payments');
    }
};
