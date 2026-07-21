<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Membership extends Model
{
    /**
     * Scheme fields locked in at enrollment time and copied into
     * `scheme_snapshot`, so that later edits to the Scheme template never
     * retroactively change an already-enrolled customer's terms. See
     * schemeTerm() for the read side.
     */
    public const SCHEME_SNAPSHOT_FIELDS = [
        'installment_value',
        'closing_penalty',
        'allow_bonus',
        'benefit_type',
        'benefit_mode',
        'bonus_no_of_installments',
        'bonus_effect_account',
        'lock_in_period_months',
        'scheme_type',
        'item_group',
    ];

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
        'previous_status',
        'scheme_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'maturity_date' => 'date',
            'card_issued_at' => 'datetime',
            'total_paid' => 'decimal:2',
            'scheme_snapshot' => 'array',
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

    public function isFullyPaid(): bool
    {
        return $this->getRemainingPayableAmount() <= 0.001;
    }

    /**
     * Read a scheme term as it was locked in at enrollment, falling back to
     * the live Scheme only for legacy memberships enrolled before
     * scheme_snapshot existed and never backfilled.
     */
    public function schemeTerm(string $key, mixed $default = null): mixed
    {
        if ($this->scheme_snapshot && array_key_exists($key, $this->scheme_snapshot)) {
            return $this->scheme_snapshot[$key] ?? $default;
        }

        return $this->scheme?->{$key} ?? $default;
    }
}
