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
    ];

    protected function casts(): array
    {
        return [
            'voucher_date' => 'date',
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
}
