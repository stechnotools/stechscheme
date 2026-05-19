<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltyCardCategory extends Model
{
    protected $fillable = [
        'category_code',
        'category_name',
        'description',
        'category_type',
        'card_color',
        'card_design',
        'card_prefix',
        'card_number_length',
        'earning_based_on',
        'points_for_every',
        'points_to_be_earned',
        'min_points_to_redeem',
        'point_expiry_months',
        'status',
        'valid_from',
        'valid_to',
        'allow_downgrade',
        'allow_upgrade',
    ];

    protected $casts = [
        'points_for_every' => 'decimal:2',
        'points_to_be_earned' => 'decimal:2',
        'min_points_to_redeem' => 'decimal:2',
        'allow_downgrade' => 'boolean',
        'allow_upgrade' => 'boolean',
        'valid_from' => 'date',
        'valid_to' => 'date',
    ];
}
