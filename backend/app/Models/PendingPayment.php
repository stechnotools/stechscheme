<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PendingPayment extends Model
{
    protected $fillable = [
        'membership_id',
        'customer_id',
        'installment_ids',
        'amount',
        'merchant_order_id',
        'phonepe_order_id',
        'status',
        'receipt_id',
    ];

    protected function casts(): array
    {
        return [
            'installment_ids' => 'array',
            'amount' => 'decimal:2',
        ];
    }

    public function membership()
    {
        return $this->belongsTo(Membership::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function receipt()
    {
        return $this->belongsTo(Receipt::class);
    }
}
