<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Slab bands for SLAB-type rules. rule_type + rule_id together point at
     * either a commission_rules row ('global') or a
     * salesman_commission_overrides row ('override') — no FK constraint
     * since the parent table varies.
     */
    public function up(): void
    {
        Schema::create('commission_rule_slabs', function (Blueprint $table) {
            $table->id();
            $table->enum('rule_type', ['global', 'override']);
            $table->unsignedBigInteger('rule_id');
            $table->decimal('from_amount', 12, 2);
            $table->decimal('to_amount', 12, 2)->nullable();
            $table->enum('value_type', ['FIXED', 'PERCENTAGE']);
            $table->decimal('commission_value', 12, 2);
            $table->timestamps();

            $table->index(['rule_type', 'rule_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commission_rule_slabs');
    }
};
