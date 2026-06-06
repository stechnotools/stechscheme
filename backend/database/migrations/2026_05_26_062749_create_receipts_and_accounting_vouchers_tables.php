<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // 1. Add columns to installments table
        Schema::table('installments', function (Blueprint $table) {
            if (! Schema::hasColumn('installments', 'paid_amount')) {
                $table->decimal('paid_amount', 10, 2)->default(0)->after('penalty');
            }
            if (! Schema::hasColumn('installments', 'balance_amount')) {
                $table->decimal('balance_amount', 10, 2)->nullable()->after('paid_amount');
            }
            if (! Schema::hasColumn('installments', 'status')) {
                $table->string('status', 20)->default('PENDING')->after('balance_amount');
            }
        });

        // Initialize existing installments
        DB::statement("UPDATE installments SET paid_amount = amount, balance_amount = 0, status = 'PAID' WHERE paid = true");
        DB::statement("UPDATE installments SET paid_amount = 0, balance_amount = amount, status = 'PENDING' WHERE paid = false");

        // 2. Create receipts table
        Schema::create('receipts', function (Blueprint $table) {
            $table->id();
            $table->string('receipt_no', 50)->unique();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->decimal('total_amount', 10, 2);
            $table->date('payment_date');
            $table->date('receipt_date')->nullable();
            $table->text('remarks')->nullable();
            $table->string('status', 20)->default('ACTIVE');
            $table->timestamps();
        });

        // 3. Create receipt_details table
        Schema::create('receipt_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('receipt_id')->constrained('receipts')->cascadeOnDelete();
            $table->foreignId('installment_id')->constrained('installments')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->decimal('late_fee', 10, 2)->default(0);
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        // 4. Create receipt_payments table
        Schema::create('receipt_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('receipt_id')->constrained('receipts')->cascadeOnDelete();
            $table->string('method', 50); // CASH, UPI, CARD, CHEQUE
            $table->decimal('amount', 10, 2);
            $table->string('transaction_id', 255)->nullable();
            $table->date('payment_date')->nullable();
            $table->timestamps();
        });

        // 5. Create vouchers table
        Schema::create('vouchers', function (Blueprint $table) {
            $table->id();
            $table->string('voucher_no', 50)->unique();
            $table->foreignId('receipt_id')->nullable()->constrained('receipts')->nullOnDelete();
            $table->string('voucher_type', 20)->default('RECEIPT');
            $table->date('voucher_date');
            $table->string('reference_table')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('narration')->nullable();
            $table->timestamps();
        });

        // 6. Create voucher_transactions table
        Schema::create('voucher_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voucher_id')->constrained('vouchers')->cascadeOnDelete();
            $table->foreignId('chart_of_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->string('ledger'); // e.g. Cash Account, Swarna Laxmi Yojana-Amount
            $table->decimal('DR', 10, 2)->default(0);
            $table->decimal('CR', 10, 2)->default(0);
            $table->timestamps();
        });

        // 7. Add receipt_id to payments table for backwards compatibility and links
        Schema::table('payments', function (Blueprint $table) {
            if (! Schema::hasColumn('payments', 'receipt_id')) {
                $table->foreignId('receipt_id')->nullable()->after('id')->constrained('receipts')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'receipt_id')) {
                $table->dropConstrainedForeignId('receipt_id');
            }
        });
        Schema::dropIfExists('voucher_transactions');
        Schema::dropIfExists('vouchers');
        Schema::dropIfExists('receipt_payments');
        Schema::dropIfExists('receipt_details');
        Schema::dropIfExists('receipts');
        Schema::table('installments', function (Blueprint $table) {
            $dropColumns = array_filter(['paid_amount', 'balance_amount', 'status'], fn ($column) => Schema::hasColumn('installments', $column));
            if ($dropColumns !== []) {
                $table->dropColumn($dropColumns);
            }
        });
    }
};
