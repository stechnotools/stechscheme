<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Installment extends Model
{
    protected $fillable = [
        'membership_id',
        'installment_no',
        'due_date',
        'amount',
        'paid',
        'paid_date',
        'penalty',
        'manual_weight',
        'paid_amount',
        'balance_amount',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'paid' => 'boolean',
            'paid_date' => 'date',
            'amount' => 'decimal:2',
            'penalty' => 'decimal:2',
            'manual_weight' => 'decimal:4',
            'paid_amount' => 'decimal:2',
            'balance_amount' => 'decimal:2',
        ];
    }

    public function membership()
    {
        return $this->belongsTo(Membership::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function receiptDetails()
    {
        return $this->hasMany(ReceiptDetail::class);
    }
}
