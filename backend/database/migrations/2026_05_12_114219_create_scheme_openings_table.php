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
        Schema::create('scheme_openings', function (Blueprint $table) {
            $table->id();
            $table->string('opening_no')->nullable();
            $table->date('opening_date');
            $table->string('account_name');
            $table->string('city')->nullable();
            $table->string('mobile_no', 20)->nullable();
            $table->string('salesman')->nullable();
            $table->string('scheme_type')->nullable();
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('total_weight', 12, 3)->default(0);
            $table->string('ticket_no')->nullable();
            $table->string('deposit_or_redeem')->nullable();
            $table->string('branch_name')->nullable();
            $table->text('narration')->nullable();
            $table->string('lot_no')->nullable();
            $table->string('scheme_name')->nullable();
            
            // Relational ID references (fully supports Eloquent belongsTo)
            $table->bigInteger('customer_id')->unsigned()->nullable();
            $table->bigInteger('scheme_id')->unsigned()->nullable();
            $table->bigInteger('salesman_id')->unsigned()->nullable();
            $table->bigInteger('branch_id')->unsigned()->nullable();
            
            $table->enum('status', ['Pending', 'Processed', 'Failed'])->default('Pending');
            $table->string('import_batch_id')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index('mobile_no');
            $table->index('opening_no');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scheme_openings');
    }
};
