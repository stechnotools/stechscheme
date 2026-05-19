<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoyaltySetup extends Model
{
    use HasFactory;

    protected $fillable = [
        'setup_code',
        'setup_name',
        'status',
        'from_date',
        'to_date',
        'loyalty_program',
        'currency',
        'rounding_method',
        'description',
        'enable_loyalty_program',
        'allow_earn_points',
        'allow_redeem_points',
        'allow_expiry',
        'point_expiry_months',
        'point_calculation_on',
        'point_value',
        'min_redeem_points',
        'max_redeem_points_per_txn',
        'allow_partial_redemption',
        'allow_redemption_on_discounted',
        'redemption_validation',
        'excluded_categories',
        'notify_on_credit',
        'notify_on_redemption',
        'notify_before_expiry',
        'points_setup_overall',
        'group_wise_points_setup',
        'category_level_setup',
        'redeem_benefits_setup',
        'others_setup',
        'notes',
        'points_for_every_wt_global',
        'points_to_be_earned_wt_global',
        'allow_introducer_points',
        'introducer_benefit_setup',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'enable_loyalty_program' => 'boolean',
        'allow_earn_points' => 'boolean',
        'allow_redeem_points' => 'boolean',
        'allow_expiry' => 'boolean',
        'allow_partial_redemption' => 'boolean',
        'allow_redemption_on_discounted' => 'boolean',
        'notify_on_credit' => 'boolean',
        'notify_on_redemption' => 'boolean',
        'notify_before_expiry' => 'boolean',
        'excluded_categories' => 'array',
        'points_setup_overall' => 'array',
        'group_wise_points_setup' => 'array',
        'category_level_setup' => 'array',
        'redeem_benefits_setup' => 'array',
        'others_setup' => 'array',
        'from_date' => 'date',
        'to_date' => 'date',
        'point_value' => 'decimal:2',
        'min_redeem_points' => 'decimal:2',
        'max_redeem_points_per_txn' => 'decimal:2',
        'points_for_every_wt_global' => 'decimal:3',
        'points_to_be_earned_wt_global' => 'decimal:2',
        'allow_introducer_points' => 'boolean',
        'introducer_benefit_setup' => 'array',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updator()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
