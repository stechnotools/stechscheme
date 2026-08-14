<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Audit trail for one duplicate-customer absorbed into a primary via
 * CustomerMergeService::merge() — carries everything undo() needs to
 * reverse that specific merge (see migration for field meanings).
 */
class CustomerMerge extends Model
{
    protected $fillable = [
        'primary_customer_id',
        'duplicate_customer_id',
        'merged_by_user_id',
        'reversed_by_user_id',
        'reversed_at',
        'duplicate_name',
        'duplicate_mobile',
        'moved_records',
        'kyc_backfilled_fields',
        'kyc_reassigned',
        'duplicate_kyc_id',
        'alternate_mobile_set',
    ];

    protected function casts(): array
    {
        return [
            'moved_records' => 'array',
            'kyc_backfilled_fields' => 'array',
            'kyc_reassigned' => 'boolean',
            'alternate_mobile_set' => 'boolean',
            'reversed_at' => 'datetime',
        ];
    }

    public function primaryCustomer()
    {
        return $this->belongsTo(Customer::class, 'primary_customer_id')->withTrashed();
    }

    public function duplicateCustomer()
    {
        return $this->belongsTo(Customer::class, 'duplicate_customer_id')->withTrashed();
    }

    public function mergedBy()
    {
        return $this->belongsTo(User::class, 'merged_by_user_id');
    }

    public function reversedBy()
    {
        return $this->belongsTo(User::class, 'reversed_by_user_id');
    }

    public function isReversed(): bool
    {
        return $this->reversed_at !== null;
    }
}
