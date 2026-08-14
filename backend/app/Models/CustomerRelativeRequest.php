<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerRelativeRequest extends Model
{
    protected $fillable = [
        'primary_customer_id',
        'relative_customer_id',
        'requested_by_user_id',
        'reviewed_by_user_id',
        'status',
        'notes',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }

    public function primaryCustomer()
    {
        return $this->belongsTo(Customer::class, 'primary_customer_id');
    }

    public function relativeCustomer()
    {
        return $this->belongsTo(Customer::class, 'relative_customer_id');
    }

    public function requestedByUser()
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function reviewedByUser()
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }
}
