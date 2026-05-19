<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltySaleData extends Model
{
    use \Illuminate\Database\Eloquent\Factories\HasFactory;

    protected $fillable = [
        'vou_date',
        'branch_name',
        'branch_id',
        'vou_no',
        'mobile_no',
        'loyalty_card_no',
        'party_name',
        'metal_name',
        'carat',
        'net_wt',
        'total_amt',
        'gst_taxable_amt',
        'salesman_name',
        'customer_id',
        'salesman_id',
        'status',
        'import_batch_id',
        'error_message',
        'introducer',
    ];

    protected $casts = [
        'vou_date' => 'date',
        'net_wt' => 'decimal:3',
        'total_amt' => 'decimal:2',
        'gst_taxable_amt' => 'decimal:2',
    ];

    public function customer(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function salesman(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'salesman_id');
    }
}
