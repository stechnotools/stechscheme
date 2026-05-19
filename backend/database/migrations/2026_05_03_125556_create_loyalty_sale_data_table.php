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
        Schema::create('loyalty_sale_data', function (Blueprint $table) {
            $table->id();
            $table->date('vou_date');
            $table->string('vou_no')->unique();
            $table->string('mobile_no', 10);
            $table->string('party_name');
            $table->string('metal_name');
            $table->string('carat');
            $table->decimal('net_wt', 12, 3);
            $table->decimal('total_amt', 12, 2);
            $table->decimal('gst_taxable_amt', 12, 2);
            $table->string('salesman_name');
            $table->foreignId('customer_id')->nullable()->constrained('customers')->onDelete('set null');
            $table->foreignId('salesman_id')->nullable()->constrained('users')->onDelete('set null');
            $table->enum('status', ['Pending', 'Processed', 'Failed'])->default('Pending');
            $table->string('import_batch_id')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index('mobile_no');
            $table->index('vou_no');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loyalty_sale_data');
    }
};
