<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'mobile',
        'password',
        'profile_photo',
        'dob',
        'gender',
        'mobile_verified',
        'mobile_verified_at',
        'status',
        'default_customer_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'mobile_verified' => 'boolean',
            'mobile_verified_at' => 'datetime',
            'dob' => 'date',
            'password' => 'hashed',
        ];
    }

    public function memberships()
    {
        return $this->hasMany(Membership::class);
    }

    public function customer()
    {
        return $this->hasOne(Customer::class);
    }

    /**
     * All Customer profiles logged in via this portal account — normally
     * one, but more than one when a household shares a single mobile number
     * (Customer::syncCustomerUser reuses this same User for each of them).
     */
    public function customers()
    {
        return $this->hasMany(Customer::class);
    }

    /**
     * The profile auto-selected on login when this User has more than one
     * linked Customer — set via CustomerPortalController::selectProfile().
     */
    public function defaultCustomer()
    {
        return $this->belongsTo(Customer::class, 'default_customer_id');
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function branches()
    {
        return $this->belongsToMany(Branch::class)->withTimestamps();
    }
}
