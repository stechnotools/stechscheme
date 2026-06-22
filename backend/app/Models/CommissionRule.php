<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommissionRule extends Model
{
    protected $fillable = [
        'commission_type_id',
        'calculation_type',
        'value',
        'is_global',
        'priority',
        'effective_from',
        'effective_to',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'is_global' => 'boolean',
            'priority' => 'integer',
            'effective_from' => 'date',
            'effective_to' => 'date',
        ];
    }

    public function commissionType()
    {
        return $this->belongsTo(CommissionType::class);
    }

    public function slabs()
    {
        return $this->hasMany(CommissionRuleSlab::class, 'rule_id')->where('rule_type', 'global');
    }
}
