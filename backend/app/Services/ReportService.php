<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerKyc;
use App\Models\Installment;
use App\Models\Membership;
use App\Models\Payment;
use App\Models\Scheme;
use App\Models\Transaction;

class ReportService
{
    public function dashboard(): array
    {
        $today = now()->toDateString();

        return [
            'customers_count' => Customer::count(),
            'schemes_count' => Scheme::count(),
            'memberships_count' => Membership::count(),
            'active_memberships_count' => Membership::where('status', 'active')->count(),
            'payments_count' => Payment::count(),
            'transactions_count' => Transaction::count(),
            'pending_installments_count' => Installment::where('paid', false)->count(),
            'overdue_installments_count' => Installment::where('paid', false)->whereDate('due_date', '<', $today)->count(),
            'pending_kyc_count' => CustomerKyc::where('status', 'pending')->count(),
            'today_collections_amount' => (float) Payment::where('status', 'success')->whereDate('payment_date', $today)->sum('amount'),
            'upcoming_maturities_count' => Membership::whereDate('maturity_date', '>=', $today)->whereDate('maturity_date', '<=', now()->addDays(30)->toDateString())->count(),
            'total_collected_amount' => (float) Payment::where('status', 'success')->sum('amount'),
        ];
    }
}
