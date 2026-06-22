<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Commission ledger. One immutable row per (event_type, source_type,
     * source_id, commission_type_id) — the unique index also acts as the
     * idempotency guard so re-processing the same enrollment/receipt never
     * double-pays commission.
     */
    public function up(): void
    {
        Schema::create('salesman_commissions', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('salesman_id')->unsigned();
            $table->bigInteger('customer_id')->unsigned()->nullable();
            $table->bigInteger('scheme_id')->unsigned()->nullable();
            $table->bigInteger('membership_id')->unsigned()->nullable();
            $table->foreignId('commission_type_id')->constrained('commission_types');

            $table->string('event_type');
            $table->string('source_type');
            $table->unsignedBigInteger('source_id');

            $table->enum('rule_source', ['global', 'override']);
            $table->unsignedBigInteger('rule_id')->nullable();
            $table->string('calculation_type')->nullable();

            $table->decimal('base_amount', 12, 2)->default(0);
            $table->decimal('commission_amount', 12, 2)->default(0);
            $table->string('status')->default('pending');
            $table->date('commission_date');
            $table->timestamp('paid_at')->nullable();

            $table->timestamps();

            $table->unique(['event_type', 'source_type', 'source_id', 'commission_type_id'], 'salesman_commissions_source_unique');
            $table->index(['salesman_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salesman_commissions');
    }
};
