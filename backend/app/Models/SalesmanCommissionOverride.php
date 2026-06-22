<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesmanCommissionOverride extends Model
{
    protected $fillable = [
        'salesman_id',
        'commission_type_id',
        'calculation_type',
        'value',
        'is_active',
        'effective_from',
        'effective_to',
        'priority',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'is_active' => 'boolean',
            'priority' => 'integer',
            'effective_from' => 'date',
            'effective_to' => 'date',
        ];
    }

    public function salesman()
    {
        return $this->belongsTo(User::class, 'salesman_id');
    }

    public function commissionType()
    {
        return $this->belongsTo(CommissionType::class);
    }

    public function slabs()
    {
        return $this->hasMany(CommissionRuleSlab::class, 'rule_id')->where('rule_type', 'override');
    }
}
