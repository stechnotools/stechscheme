<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MetalRateLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'metal_master_id',
        'old_rate',
        'new_rate',
        'updated_by',
    ];

    public function metalMaster()
    {
        return $this->belongsTo(MetalMaster::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
