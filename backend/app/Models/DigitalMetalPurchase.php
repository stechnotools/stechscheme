<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DigitalMetalPurchase extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'digital_metal_master_id',
        'weight',
        'rate_per_gm',
        'markup_amount',
        'total_amount',
        'status',
        'payment_mode',
        'transaction_id',
        'created_by',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function digitalMetalMaster()
    {
        return $this->belongsTo(DigitalMetalMaster::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
