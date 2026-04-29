<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MetalMaster extends Model
{
    use HasFactory;

    protected $fillable = [
        'metal_name',
        'rate_per',
        'rate_per_unit',
        'rate_per_display_text',
        'rate_from',
        'erp_metal_id',
        'group_name',
        'display_text',
        'show_in_dashboard',
        'sort_order',
        'is_decimal_allow',
        'booking_amount_percent',
        'status',
        'created_by',
    ];

    protected $casts = [
        'show_in_dashboard' => 'boolean',
        'is_decimal_allow' => 'boolean',
        'sort_order' => 'integer',
        'rate_per' => 'decimal:2',
        'booking_amount_percent' => 'decimal:2',
        'created_by' => 'integer',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lastRateLog()
    {
        return $this->hasOne(MetalRateLog::class)->latestOfMany();
    }
}
