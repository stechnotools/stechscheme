<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerKyc extends Model
{
    protected $fillable = [
        'customer_id',
        'aadhaar_number',
        'pan_number',
        'aadhaar_file',
        'pan_file',
        'photo',
        'address',
        'city',
        'state',
        'pincode',
        'status',
        'remarks',
        'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
