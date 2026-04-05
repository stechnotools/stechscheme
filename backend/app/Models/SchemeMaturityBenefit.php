<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchemeMaturityBenefit extends Model
{
    protected $fillable = [
        'scheme_id',
        'month',
        'type',
        'value',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
        ];
    }

    public function scheme()
    {
        return $this->belongsTo(Scheme::class);
    }
}
