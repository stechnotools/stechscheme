<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltyProgramme extends Model
{
    protected $fillable = [
        'name',
        'description',
        'points_per_amount',
        'min_redemption_points',
        'status',
    ];
}
