<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Installment extends Model
{
    protected $fillable = [
        'membership_id',
        'installment_no',
        'due_date',
        'amount',
        'paid',
        'paid_date',
        'penalty',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'paid' => 'boolean',
            'paid_date' => 'date',
            'amount' => 'decimal:2',
            'penalty' => 'decimal:2',
        ];
    }

    public function membership()
    {
        return $this->belongsTo(Membership::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}
