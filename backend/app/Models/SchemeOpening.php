<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchemeOpening extends Model
{
    protected $fillable = [
        'opening_no',
        'opening_date',
        'account_name',
        'city',
        'mobile_no',
        'salesman',
        'scheme_type',
        'total_amount',
        'installment_amount',
        'number_of_months',
        'total_weight',
        'ticket_no',
        'deposit_or_redeem',
        'branch_name',
        'narration',
        'lot_no',
        'scheme_name',
        
        // Relational links
        'customer_id',
        'scheme_id',
        'salesman_id',
        'branch_id',
        
        // Status tracking
        'status',
        'import_batch_id',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'opening_date' => 'date',
            'total_amount' => 'decimal:2',
            'installment_amount' => 'decimal:2',
            'number_of_months' => 'integer',
            'total_weight' => 'decimal:3',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function scheme()
    {
        return $this->belongsTo(Scheme::class);
    }

    public function salesmanUser()
    {
        return $this->belongsTo(User::class, 'salesman_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
