<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltyLedger extends Model
{
    use \Illuminate\Database\Eloquent\Factories\HasFactory;

    protected $fillable = [
        'customer_id',
        'transaction_type',
        'points',
        'description',
        'reference_id',
        'reference_type',
        'transaction_date',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'points' => 'decimal:2',
    ];

    public function customer(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
