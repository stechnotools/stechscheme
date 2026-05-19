<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DigitalMetalSale extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'digital_metal_master_id',
        'voucher_no',
        'voucher_date',
        'weight',
        'pcs',
        'rate_per_gm',
        'other_charges',
        'salesman',
        'salesman_id',
        'markup_amount',
        'total_amount',
        'discount_amount',
        'gst_amount',
        'customer_mobile',
        'customer_address',
        'status',
        'payment_mode',
        'transaction_id',
        'payment_details',
        'created_by',
    ];

    protected $casts = [
        'payment_details' => 'array',
        'voucher_date' => 'date',
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

    public function salesmanUser()
    {
        return $this->belongsTo(User::class, 'salesman_id');
    }
}
