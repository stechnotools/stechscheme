<?php

namespace App\Repositories;

use App\Models\Payment;

class PaymentRepository
{
    public function latestSuccessful(int $limit = 10)
    {
        return Payment::query()
            ->where('status', 'success')
            ->latest('payment_date')
            ->limit($limit)
            ->get();
    }
}
