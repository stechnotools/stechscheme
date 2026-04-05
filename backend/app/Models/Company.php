<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'logo',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function customers()
    {
        return $this->hasMany(Customer::class);
    }

    public function schemes()
    {
        return $this->hasMany(Scheme::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
