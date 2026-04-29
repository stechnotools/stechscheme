<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalMetalMaster extends Model
{
    use HasFactory;

    protected $fillable = [
        'metal_name',
        'purity',
        'display_text',
        'min_purchase_weight',
        'min_purchase_amount',
        'max_purchase_amount',
        'rate_per',
        'rate_per_unit',
        'rate_per_display_text',
        'rate_from',
        'erp_metal_id',
        'buy_markup_amount',
        'sell_markup_amount',
        'is_decimal_allow',
        'status',
        'created_by',
    ];

    protected $casts = [
        'min_purchase_weight' => 'decimal:4',
        'min_purchase_amount' => 'decimal:2',
        'max_purchase_amount' => 'decimal:2',
        'rate_per' => 'decimal:2',
        'buy_markup_amount' => 'decimal:2',
        'sell_markup_amount' => 'decimal:2',
        'is_decimal_allow' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lastLog()
    {
        return $this->hasOne(DigitalMetalMasterLog::class, 'digital_metal_master_id')->latestOfMany();
    }
}
