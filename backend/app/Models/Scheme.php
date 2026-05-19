<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Scheme extends Model
{
    protected $fillable = [
        'name',
        'code',
        'description',
        'installment_value',
        'min_installment_value',
        'total_installments',
        'free_installments',
        'max_installments',
        'scheme_type',
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
        'grace_days',
        'closing_penalty',
        'allow_overdue',
        'late_fee_effect_account',
        'late_fee_type',
        'late_fee_value',
        'wt_booked_with_gst',
        'gold_rate_policy',
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
        'lock_in_period_months',
        'redemption_window_days',
        'booking_purity',
        'allow_va_discount',
        'va_discount_percentage',
        'banner_image_path',
        'workflow_html',
    ];

    protected function casts(): array
    {
        return [
            'installment_value' => 'decimal:2',
            'min_installment_value' => 'decimal:2',
            'late_fee_value' => 'decimal:2',
            'closing_penalty' => 'decimal:2',
            'first_installment_multiple_of' => 'decimal:2',
            'va_discount_percentage' => 'decimal:2',
            'allow_overdue' => 'boolean',
            'wt_booked_with_gst' => 'boolean',
            'allow_change_rate_closing' => 'boolean',
            'allow_bonus' => 'boolean',
            'allow_va_discount' => 'boolean',
            'is_closed' => 'boolean',
            'start_date' => 'date',
            'termination_date' => 'date',
        ];
    }

    public function maturityBenefits()
    {
        return $this->hasMany(SchemeMaturityBenefit::class);
    }

    public function memberships()
    {
        return $this->hasMany(Membership::class);
    }
}
