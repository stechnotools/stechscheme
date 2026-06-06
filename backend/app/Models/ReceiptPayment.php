<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReceiptPayment extends Model
{
    protected $fillable = [
        'receipt_id',
        'method',
        'amount',
        'transaction_id',
        'payment_date',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payment_date' => 'date',
        ];
    }

    public function receipt()
    {
        return $this->belongsTo(Receipt::class);
    }
}
