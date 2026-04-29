<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MetalBuyingOption extends Model
{
    use HasFactory;

    protected $fillable = [
        'digital_metal_master_id',
        'option_name',
        'display_text',
        'option_value',
        'status',
        'created_by',
        'updated_by'
    ];

    public function digitalMetalMaster()
    {
        return $this->belongsTo(DigitalMetalMaster::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updator()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
