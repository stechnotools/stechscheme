<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommissionType extends Model
{
    protected $fillable = [
        'code',
        'name',
        'status',
    ];

    public function rules()
    {
        return $this->hasMany(CommissionRule::class);
    }

    public function overrides()
    {
        return $this->hasMany(SalesmanCommissionOverride::class);
    }
}
