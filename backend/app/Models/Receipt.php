<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Receipt extends Model
{
    protected $fillable = [
        'receipt_no',
        'branch_id',
        'customer_id',
        'total_amount',
        'payment_date',
        'receipt_date',
        'remarks',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date',
            'receipt_date' => 'date',
            'total_amount' => 'decimal:2',
        ];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function details()
    {
        return $this->hasMany(ReceiptDetail::class);
    }

    public function payments()
    {
        return $this->hasMany(ReceiptPayment::class);
    }

    public function voucher()
    {
        return $this->hasOne(Voucher::class);
    }

    public function legacyPayments()
    {
        return $this->hasMany(Payment::class);
    }
}
