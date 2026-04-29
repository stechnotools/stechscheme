<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DigitalMetalMasterLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'digital_metal_master_id',
        'old_rate',
        'new_rate',
        'old_buy_markup',
        'new_buy_markup',
        'old_sell_markup',
        'new_sell_markup',
        'updated_by',
    ];

    public function digitalMetalMaster()
    {
        return $this->belongsTo(DigitalMetalMaster::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
