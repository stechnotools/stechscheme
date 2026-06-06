<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReceiptDetail extends Model
{
    protected $fillable = [
        'receipt_id',
        'installment_id',
        'amount',
        'late_fee',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'late_fee' => 'decimal:2',
        ];
    }

    public function receipt()
    {
        return $this->belongsTo(Receipt::class);
    }

    public function installment()
    {
        return $this->belongsTo(Installment::class);
    }
}
