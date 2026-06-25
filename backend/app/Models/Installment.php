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

    /**
     * Single source of truth for "overdue" — shared by the customer dashboard
     * (in-memory collection filter) and the reminder command (DB query scope).
     */
    public function isOverdueNow(): bool
    {
        return ! $this->paid && $this->due_date !== null && $this->due_date->isPast();
    }

    public function scopeUnpaid($query)
    {
        return $query->where('paid', false);
    }

    public function scopeOverdue($query)
    {
        return $query->unpaid()->whereDate('due_date', '<', now()->toDateString());
    }

    public function scopeDueWithin($query, int $days)
    {
        return $query->unpaid()->whereDate('due_date', '>=', now()->toDateString())
            ->whereDate('due_date', '<=', now()->addDays($days)->toDateString());
    }
}
