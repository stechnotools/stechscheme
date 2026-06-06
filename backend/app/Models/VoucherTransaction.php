<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoucherTransaction extends Model
{
    protected $fillable = [
        'voucher_id',
        'chart_of_account_id',
        'ledger',
        'DR',
        'CR',
    ];

    protected function casts(): array
    {
        return [
            'DR' => 'decimal:2',
            'CR' => 'decimal:2',
        ];
    }

    public function voucher()
    {
        return $this->belongsTo(Voucher::class);
    }

    public function chartOfAccount()
    {
        return $this->belongsTo(ChartOfAccount::class);
    }
}
