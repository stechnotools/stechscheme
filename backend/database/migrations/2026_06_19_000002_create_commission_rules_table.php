<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Global commission rules. These are the default rules applied to every
     * salesman unless a salesman_commission_overrides row takes precedence.
     */
    public function up(): void
    {
        Schema::create('commission_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('commission_type_id')->constrained('commission_types');
            $table->enum('calculation_type', ['FIXED', 'PERCENTAGE', 'SLAB']);
            $table->decimal('value', 12, 2)->nullable();
            $table->boolean('is_global')->default(true);
            $table->integer('priority')->default(0);
            $table->date('effective_from')->nullable();
            $table->date('effective_to')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->index(['commission_type_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commission_rules');
    }
};
