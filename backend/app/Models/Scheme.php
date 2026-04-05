<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Scheme extends Model
{
    protected $fillable = [
        'company_id',
        'name',
        'code',
        'installment_value',
        'total_installments',
        'scheme_type',
        'grace_days',
        'allow_overdue',
    ];

    protected function casts(): array
    {
        return [
            'installment_value' => 'decimal:2',
            'allow_overdue' => 'boolean',
        ];
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function maturityBenefits()
    {
        return $this->hasMany(SchemeMaturityBenefit::class);
    }

    public function memberships()
    {
        return $this->hasMany(Membership::class);
    }
}
