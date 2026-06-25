<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchemeJoinRequest extends Model
{
    protected $fillable = [
        'customer_id',
        'scheme_id',
        'terms_accepted_at',
        'status',
        'notes',
        'converted_membership_id',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'terms_accepted_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function scheme()
    {
        return $this->belongsTo(Scheme::class);
    }

    public function convertedMembership()
    {
        return $this->belongsTo(Membership::class, 'converted_membership_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
