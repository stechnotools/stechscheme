<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
    protected $fillable = [
        'voucher_no',
        'receipt_id',
        'voucher_type',
        'voucher_date',
        'reference_table',
        'reference_id',
        'narration',
        'reversed_at',
        'reversal_of_voucher_id',
    ];

    protected function casts(): array
    {
        return [
            'voucher_date' => 'date',
            'reversed_at' => 'datetime',
        ];
    }

    public function receipt()
    {
        return $this->belongsTo(Receipt::class);
    }

    public function transactions()
    {
        return $this->hasMany(VoucherTransaction::class);
    }

    public function reversalOf()
    {
        return $this->belongsTo(self::class, 'reversal_of_voucher_id');
    }
}
