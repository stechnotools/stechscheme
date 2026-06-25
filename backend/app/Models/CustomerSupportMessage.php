<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerSupportMessage extends Model
{
    protected $fillable = [
        'customer_id',
        'subject',
        'message',
        'status',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
