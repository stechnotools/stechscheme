<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Scheme extends Model
{
    protected $fillable = [
        'name',
        'code',
        'installment_value',
        'total_installments',
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
        'allow_overdue',
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
    ];

    protected function casts(): array
    {
        return [
            'installment_value' => 'decimal:2',
            'first_installment_multiple_of' => 'decimal:2',
            'allow_overdue' => 'boolean',
            'wt_booked_with_gst' => 'boolean',
            'allow_change_rate_closing' => 'boolean',
            'allow_bonus' => 'boolean',
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
