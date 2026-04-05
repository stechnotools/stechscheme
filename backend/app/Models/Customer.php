<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $fillable = [
        'company_id',
        'name',
        'mobile',
        'email',
        'status',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function kyc()
    {
        return $this->hasOne(CustomerKyc::class);
    }
}
