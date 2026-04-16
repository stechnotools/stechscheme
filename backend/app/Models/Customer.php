<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'mobile',
        'email',
        'status',
        'portal_enabled',
        'portal_enabled_at',
    ];

    protected function casts(): array
    {
        return [
            'portal_enabled' => 'boolean',
            'portal_enabled_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function kyc()
    {
        return $this->hasOne(CustomerKyc::class);
    }

    public function memberships()
    {
        return $this->hasMany(Membership::class);
    }
}
