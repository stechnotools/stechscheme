<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schemes', function (Blueprint $table) {
            $table->string('item_group')->nullable()->after('scheme_type');
            $table->date('start_date')->nullable()->after('item_group');
            $table->date('termination_date')->nullable()->after('start_date');
            $table->boolean('is_closed')->default(false)->after('termination_date');

            $table->string('no_of_installment_type')->default('Fix')->after('is_closed');
            $table->integer('min_no_of_installments')->nullable()->after('no_of_installment_type');
            $table->string('installment_code')->nullable()->after('min_no_of_installments');
            $table->string('installment_base')->nullable()->after('installment_code');
            $table->string('installment_duration')->nullable()->after('installment_base');
            $table->decimal('first_installment_multiple_of', 10, 2)->nullable()->after('installment_duration');

            $table->string('late_fee_effect_account')->nullable()->after('allow_overdue');
            $table->boolean('wt_booked_with_gst')->default(false)->after('late_fee_effect_account');

            $table->integer('maturity_months_after_last_installment')->default(0)->after('wt_booked_with_gst');
            $table->string('apply_rate')->nullable()->after('maturity_months_after_last_installment');
            $table->boolean('allow_change_rate_closing')->default(false)->after('apply_rate');
            $table->string('advance_closure_account')->nullable()->after('allow_change_rate_closing');

            $table->boolean('allow_bonus')->default(false)->after('advance_closure_account');
            $table->string('benefit_type')->nullable()->after('allow_bonus');
            $table->string('benefit_mode')->nullable()->after('benefit_type');
            $table->integer('bonus_no_of_installments')->nullable()->after('benefit_mode');
            $table->string('bonus_effect_account')->nullable()->after('bonus_no_of_installments');

            $table->string('effect_to_account')->nullable()->after('bonus_effect_account');
            $table->string('interest_receivable_account')->nullable()->after('effect_to_account');
            $table->string('advertisement_publicity_account')->nullable()->after('interest_receivable_account');
            $table->text('remarks')->nullable()->after('advertisement_publicity_account');
        });
    }

    public function down(): void
    {
        Schema::table('schemes', function (Blueprint $table) {
            $table->dropColumn([
                'item_group',
                'start_date',
                'termination_date',
                'is_closed',
                'no_of_installment_type',
                'min_no_of_installments',
                'installment_code',
                'installment_base',
                'installment_duration',
                'first_installment_multiple_of',
                'late_fee_effect_account',
                'wt_booked_with_gst',
                'maturity_months_after_last_installment',
                'apply_rate',
                'allow_change_rate_closing',
                'advance_closure_account',
                'allow_bonus',
                'benefit_type',
                'benefit_mode',
                'bonus_no_of_installments',
                'bonus_effect_account',
                'effect_to_account',
                'interest_receivable_account',
                'advertisement_publicity_account',
                'remarks',
            ]);
        });
    }
};
