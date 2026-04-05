<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Customer;
use App\Models\Installment;
use App\Models\Membership;
use App\Models\Payment;
use App\Models\Scheme;
use App\Models\Transaction;

class ReportService
{
    public function dashboard(): array
    {
        return [
            'companies_count' => Company::count(),
            'customers_count' => Customer::count(),
            'schemes_count' => Scheme::count(),
            'memberships_count' => Membership::count(),
            'payments_count' => Payment::count(),
            'transactions_count' => Transaction::count(),
            'pending_installments_count' => Installment::where('paid', false)->count(),
            'total_collected_amount' => (float) Payment::where('status', 'success')->sum('amount'),
        ];
    }
}
