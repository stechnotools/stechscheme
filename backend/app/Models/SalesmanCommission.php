<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesmanCommission extends Model
{
    protected $fillable = [
        'salesman_id',
        'customer_id',
        'scheme_id',
        'membership_id',
        'commission_type_id',
        'event_type',
        'source_type',
        'source_id',
        'rule_source',
        'rule_id',
        'calculation_type',
        'base_amount',
        'commission_amount',
        'status',
        'commission_date',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'base_amount' => 'decimal:2',
            'commission_amount' => 'decimal:2',
            'commission_date' => 'date',
            'paid_at' => 'datetime',
        ];
    }

    public function salesman()
    {
        return $this->belongsTo(User::class, 'salesman_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function scheme()
    {
        return $this->belongsTo(Scheme::class);
    }

    public function membership()
    {
        return $this->belongsTo(Membership::class);
    }

    public function commissionType()
    {
        return $this->belongsTo(CommissionType::class);
    }
}
