<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Membership extends Model
{
    protected $fillable = [
        'customer_id',
        'user_id',
        'scheme_id',
        'membership_no',
        'card_no',
        'card_reference',
        'card_issued_at',
        'start_date',
        'maturity_date',
        'total_paid',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'maturity_date' => 'date',
            'card_issued_at' => 'datetime',
            'total_paid' => 'decimal:2',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function scheme()
    {
        return $this->belongsTo(Scheme::class);
    }

    public function installments()
    {
        return $this->hasMany(Installment::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Single source of truth for "how much can still be paid on this membership" —
     * shared by PaymentController (staff entry) and the customer-portal payment
     * flow so both enforce identical limits.
     */
    public function getRemainingPayableAmount(): float
    {
        $installments = $this->relationLoaded('installments')
            ? $this->installments
            : $this->installments()->get(['amount', 'penalty', 'paid_amount']);

        return round((float) $installments->sum(function ($installment) {
            return max(
                0,
                (float) $installment->amount + (float) ($installment->penalty ?? 0) - (float) ($installment->paid_amount ?? 0)
            );
        }), 2);
    }
}
