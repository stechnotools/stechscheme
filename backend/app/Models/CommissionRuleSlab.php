<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommissionRuleSlab extends Model
{
    protected $fillable = [
        'rule_type',
        'rule_id',
        'from_amount',
        'to_amount',
        'value_type',
        'commission_value',
    ];

    protected function casts(): array
    {
        return [
            'from_amount' => 'decimal:2',
            'to_amount' => 'decimal:2',
            'commission_value' => 'decimal:2',
        ];
    }
}
