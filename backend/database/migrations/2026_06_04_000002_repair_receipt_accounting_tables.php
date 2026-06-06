<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('receipts')) {
            Schema::table('receipts', function (Blueprint $table) {
                if (! Schema::hasColumn('receipts', 'customer_id')) {
                    $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
                }

                if (! Schema::hasColumn('receipts', 'receipt_date')) {
                    $table->date('receipt_date')->nullable();
                }

                if (! Schema::hasColumn('receipts', 'remarks')) {
                    $table->text('remarks')->nullable();
                }

                if (! Schema::hasColumn('receipts', 'status')) {
                    $table->string('status', 20)->default('ACTIVE');
                }
            });
        }

        if (Schema::hasTable('receipt_details')) {
            Schema::table('receipt_details', function (Blueprint $table) {
                if (! Schema::hasColumn('receipt_details', 'late_fee')) {
                    $table->decimal('late_fee', 10, 2)->default(0);
                }

                if (! Schema::hasColumn('receipt_details', 'remarks')) {
                    $table->text('remarks')->nullable();
                }
            });
        }

        if (Schema::hasTable('receipt_payments')) {
            Schema::table('receipt_payments', function (Blueprint $table) {
                if (! Schema::hasColumn('receipt_payments', 'payment_date')) {
                    $table->date('payment_date')->nullable();
                }
            });
        }

        if (Schema::hasTable('vouchers')) {
            Schema::table('vouchers', function (Blueprint $table) {
                if (! Schema::hasColumn('vouchers', 'voucher_type')) {
                    $table->string('voucher_type', 20)->default('RECEIPT');
                }

                if (! Schema::hasColumn('vouchers', 'reference_table')) {
                    $table->string('reference_table')->nullable();
                }

                if (! Schema::hasColumn('vouchers', 'reference_id')) {
                    $table->unsignedBigInteger('reference_id')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('vouchers')) {
            Schema::table('vouchers', function (Blueprint $table) {
                $columns = array_filter(
                    ['voucher_type', 'reference_table', 'reference_id'],
                    fn (string $column) => Schema::hasColumn('vouchers', $column)
                );

                if ($columns !== []) {
                    $table->dropColumn($columns);
                }
            });
        }

        if (Schema::hasTable('receipt_payments') && Schema::hasColumn('receipt_payments', 'payment_date')) {
            Schema::table('receipt_payments', function (Blueprint $table) {
                $table->dropColumn('payment_date');
            });
        }

        if (Schema::hasTable('receipt_details')) {
            Schema::table('receipt_details', function (Blueprint $table) {
                $columns = array_filter(
                    ['late_fee', 'remarks'],
                    fn (string $column) => Schema::hasColumn('receipt_details', $column)
                );

                if ($columns !== []) {
                    $table->dropColumn($columns);
                }
            });
        }

        if (Schema::hasTable('receipts')) {
            Schema::table('receipts', function (Blueprint $table) {
                if (Schema::hasColumn('receipts', 'customer_id')) {
                    $table->dropConstrainedForeignId('customer_id');
                }

                $columns = array_filter(
                    ['receipt_date', 'remarks', 'status'],
                    fn (string $column) => Schema::hasColumn('receipts', $column)
                );

                if ($columns !== []) {
                    $table->dropColumn($columns);
                }
            });
        }
    }
};
