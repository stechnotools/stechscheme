<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Salesman-specific commission rules. When active and within their
     * effective window, these take precedence over the matching global
     * commission_rules row for the same commission_type.
     */
    public function up(): void
    {
        Schema::create('salesman_commission_overrides', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('salesman_id')->unsigned();
            $table->foreignId('commission_type_id')->constrained('commission_types');
            $table->enum('calculation_type', ['FIXED', 'PERCENTAGE', 'SLAB']);
            $table->decimal('value', 12, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->integer('priority')->default(0);
            $table->timestamps();

            $table->index(['salesman_id', 'commission_type_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salesman_commission_overrides');
    }
};
