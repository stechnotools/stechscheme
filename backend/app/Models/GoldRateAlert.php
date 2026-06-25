<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GoldRateAlert extends Model
{
    protected $fillable = [
        'customer_id',
        'digital_metal_master_id',
        'target_rate',
        'direction',
        'triggered',
    ];

    protected function casts(): array
    {
        return [
            'target_rate' => 'decimal:2',
            'triggered' => 'boolean',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function digitalMetalMaster()
    {
        return $this->belongsTo(DigitalMetalMaster::class);
    }
}
