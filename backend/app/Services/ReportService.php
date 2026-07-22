<?php

namespace App\Services;

use App\Models\ChartOfAccount;
use App\Models\Customer;
use App\Models\CustomerKyc;
use App\Models\Installment;
use App\Models\Membership;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\Scheme;
use App\Models\Transaction;
use App\Models\Voucher;
use App\Models\VoucherTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    public function dailyCollection(Request $request): array
    {
        $dateFrom = $request->input('date_from', now()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());
        $gateway = $request->input('gateway');
        $branchId = $request->input('branch_id');

        $query = Payment::query()
            ->with(['membership.customer', 'membership.scheme', 'receipt.branch'])
            ->where('status', 'success')
            ->whereDate('payment_date', '>=', $dateFrom)
            ->whereDate('payment_date', '<=', $dateTo);

        if (! empty($gateway)) {
            $query->where('gateway', $gateway);
        }

        if (! empty($branchId)) {
            $query->whereHas('receipt', fn ($q) => $q->where('branch_id', $branchId));
        }

        $query->orderBy('payment_date', 'desc')->orderBy('id', 'desc');

        $perPage = max(1, min((int) $request->input('per_page', 50), 200));
        $paginated = $query->paginate($perPage);

        // Compute payment-mode totals within the date range
        $totalsQuery = Payment::query()
            ->where('status', 'success')
            ->whereDate('payment_date', '>=', $dateFrom)
            ->whereDate('payment_date', '<=', $dateTo);

        if (! empty($gateway)) {
            $totalsQuery->where('gateway', $gateway);
        }

        if (! empty($branchId)) {
            $totalsQuery->whereHas('receipt', fn ($q) => $q->where('branch_id', $branchId));
        }

        $totalsByGateway = (clone $totalsQuery)
            ->groupBy('gateway')
            ->selectRaw("COALESCE(NULLIF(gateway, ''), 'cash') as gateway, SUM(amount) as total")
            ->pluck('total', 'gateway');

        $grandTotal = (float) (clone $totalsQuery)->sum('amount');

        $modeTotals = [
            'cash' => (float) ($totalsByGateway['cash'] ?? 0),
            'upi' => (float) ($totalsByGateway['upi'] ?? 0),
            'card' => (float) ($totalsByGateway['card'] ?? 0),
            'cheque' => (float) ($totalsByGateway['cheque'] ?? 0),
            'other' => 0.0,
        ];

        foreach ($totalsByGateway as $gw => $total) {
            $gw = strtolower(trim((string) $gw));
            if (! array_key_exists($gw, $modeTotals)) {
                $modeTotals['other'] += (float) $total;
            }
        }

        $modeTotals['grand_total'] = $grandTotal;
        $modeTotals['transaction_count'] = (clone $totalsQuery)->count();

        // Transform each payment into a flat row for the report table
        $rows = collect($paginated->items())->map(function (Payment $payment) {
            $membership = $payment->membership;

            return [
                'id' => $payment->id,
                'receipt_no' => $payment->receipt?->receipt_no ?? 'N/A',
                'payment_date' => $payment->payment_date?->toDateString(),
                'customer_name' => $membership?->customer?->name ?? 'Unknown',
                'customer_mobile' => $membership?->customer?->mobile ?? '',
                'scheme_name' => $membership?->scheme?->name ?? 'N/A',
                'scheme_code' => $membership?->scheme?->code ?? '',
                'membership_no' => $membership?->membership_no ?? 'N/A',
                'amount' => (float) $payment->amount,
                'gateway' => $payment->gateway ?? 'cash',
                'transaction_id' => $payment->transaction_id ?? '',
                'branch_name' => $payment->receipt?->branch?->name ?? '',
            ];
        });

        return [
            'data' => $rows,
            'mode_totals' => $modeTotals,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'gateway' => $gateway,
                'branch_id' => $branchId,
            ],
        ];
    }

    public function customerLedger(Request $request): array
    {
        $customerId = $request->input('customer_id');
        $dateFrom = $request->input('date_from', now()->startOfMonth()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());
        $branchId = $request->input('branch_id');

        // Find the customer deposit ledger COA(s) for the requested customer
        $coaQuery = ChartOfAccount::query()
            ->where('source_type', 'customer_deposit');

        if (! empty($customerId)) {
            $coaQuery->where('source_id', (int) $customerId);
        }

        $coaIds = $coaQuery->pluck('id');

        if ($coaIds->isEmpty()) {
            return [
                'data' => [],
                'meta' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 50,
                    'total' => 0,
                ],
                'summary' => [
                    'total_debit' => 0,
                    'total_credit' => 0,
                    'closing_balance' => 0,
                    'customer_name' => null,
                    'customer_mobile' => null,
                ],
            ];
        }

        // Query VoucherTransaction entries for those COAs.
        // Use explicit join() instead of whereHas() so we can order by
        // voucher columns (whereHas creates a subquery, not a join).
        $baseJoin = function ($q) use ($branchId, $dateFrom, $dateTo) {
            $q->join('vouchers', 'voucher_transactions.voucher_id', '=', 'vouchers.id')
              ->whereNull('vouchers.reversed_at')
              ->whereDate('vouchers.voucher_date', '>=', $dateFrom)
              ->whereDate('vouchers.voucher_date', '<=', $dateTo);

            if (! empty($branchId)) {
                $q->join('receipts', 'vouchers.receipt_id', '=', 'receipts.id')
                  ->where('receipts.branch_id', (int) $branchId);
            }
        };

        $query = VoucherTransaction::query()
            ->with(['voucher.receipt.customer', 'voucher.receipt.branch', 'chartOfAccount'])
            ->whereIn('chart_of_account_id', $coaIds);

        $baseJoin($query);

        $query->orderBy('vouchers.voucher_date', 'asc')
              ->orderBy('vouchers.id', 'asc')
              ->select('voucher_transactions.*');

        $perPage = max(1, min((int) $request->input('per_page', 50), 200));
        $paginated = $query->paginate($perPage);

        // Compute summary totals (clone the base join logic)
        $totalsQuery = VoucherTransaction::query()
            ->whereIn('chart_of_account_id', $coaIds);

        $baseJoin($totalsQuery);

        $totalDebit = (float) (clone $totalsQuery)->sum('voucher_transactions.DR');
        $totalCredit = (float) (clone $totalsQuery)->sum('voucher_transactions.CR');

        // Get all entries before date range for opening balance
        $openingBalanceQuery = VoucherTransaction::query()
            ->whereIn('chart_of_account_id', $coaIds)
            ->join('vouchers', 'voucher_transactions.voucher_id', '=', 'vouchers.id')
            ->whereNull('vouchers.reversed_at')
            ->whereDate('vouchers.voucher_date', '<', $dateFrom);

        if (! empty($branchId)) {
            $openingBalanceQuery->join('receipts', 'vouchers.receipt_id', '=', 'receipts.id')
                ->where('receipts.branch_id', (int) $branchId);
        }

        $openingDebit = (float) (clone $openingBalanceQuery)->sum('voucher_transactions.DR');
        $openingCredit = (float) (clone $openingBalanceQuery)->sum('voucher_transactions.CR');
        $openingBalance = $openingCredit - $openingDebit;

        // Get customer info from first entry
        $firstEntry = $paginated->first();
        $customerInfo = null;

        if ($firstEntry && $firstEntry->voucher?->receipt?->customer) {
            $c = $firstEntry->voucher->receipt->customer;
            $customerInfo = [
                'id' => $c->id,
                'name' => $c->name,
                'mobile' => $c->mobile,
            ];
        } elseif (! empty($customerId)) {
            $customer = Customer::find((int) $customerId);
            if ($customer) {
                $customerInfo = [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'mobile' => $customer->mobile,
                ];
            }
        }

        // Build running balance
        $runningBalance = $openingBalance;
        $rows = collect($paginated->items())->map(function (VoucherTransaction $vt) use (&$runningBalance) {
            $voucher = $vt->voucher;
            $receipt = $voucher?->receipt;
            $debit = (float) $vt->DR;
            $credit = (float) $vt->CR;

            $runningBalance += $credit - $debit;

            $particular = $voucher?->narration
                ?? ($receipt ? "Receipt {$receipt->receipt_no}" : 'Voucher #' . ($voucher?->id ?? 'N/A'));

            return [
                'id' => $vt->id,
                'date' => $voucher?->voucher_date?->toDateString(),
                'voucher_no' => $voucher?->voucher_no ?? 'N/A',
                'voucher_type' => $voucher?->voucher_type ?? '',
                'particular' => $particular,
                'debit' => $debit,
                'credit' => $credit,
                'balance' => round($runningBalance, 2),
                'receipt_no' => $receipt?->receipt_no ?? null,
                'branch_name' => $receipt?->branch?->name ?? '',
            ];
        });

        return [
            'data' => $rows,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'summary' => [
                'opening_balance' => round($openingBalance, 2),
                'total_debit' => round($totalDebit, 2),
                'total_credit' => round($totalCredit, 2),
                'closing_balance' => round($openingBalance + $totalCredit - $totalDebit, 2),
                'customer' => $customerInfo,
            ],
            'filters' => [
                'customer_id' => $customerId,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'branch_id' => $branchId,
            ],
        ];
    }

    public function customerStatement(Request $request): array
    {
        $customerId = $request->input('customer_id');
        $membershipId = $request->input('membership_id');
        $dateFrom = $request->input('date_from', now()->startOfMonth()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());
        $status = $request->input('status'); // 'paid', 'pending', or all

        if (empty($customerId) && empty($membershipId)) {
            return [
                'data' => [],
                'memberships' => [],
                'meta' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 50,
                    'total' => 0,
                ],
                'summary' => [
                    'total_paid' => 0,
                    'total_due' => 0,
                    'total_penalty' => 0,
                    'customer' => null,
                ],
            ];
        }

        // Resolve customer and memberships
        if (! empty($membershipId)) {
            $membership = Membership::query()->with(['customer', 'scheme', 'installments'])->findOrFail((int) $membershipId);
            $customer = $membership->customer;
            $memberships = collect([$membership]);
        } elseif (! empty($customerId)) {
            $customer = Customer::query()->with(['memberships' => fn ($q) => $q->with(['scheme', 'installments'])])->findOrFail((int) $customerId);
            $memberships = $customer->memberships;
        } else {
            return [];
        }

        // Collect all membership IDs for payment queries
        $membershipIds = $memberships->pluck('id');

        // Build payment query: all payments for these memberships within date range
        $paymentQuery = Payment::query()
            ->with(['receipt', 'installment', 'membership.scheme', 'membership.customer'])
            ->whereIn('membership_id', $membershipIds)
            ->where('status', 'success')
            ->whereDate('payment_date', '>=', $dateFrom)
            ->whereDate('payment_date', '<=', $dateTo);

        if (! empty($status) && $status === 'paid') {
            // Already filtered by status=success above
        }

        $paymentQuery->orderBy('payment_date', 'asc')->orderBy('id', 'asc');

        $perPage = max(1, min((int) $request->input('per_page', 50), 200));
        $paginated = $paymentQuery->paginate($perPage);

        // Calculate totals
        $totalsQuery = Payment::query()
            ->whereIn('membership_id', $membershipIds)
            ->where('status', 'success')
            ->whereDate('payment_date', '>=', $dateFrom)
            ->whereDate('payment_date', '<=', $dateTo);

        $totalPaid = (float) (clone $totalsQuery)->sum('amount');

        // Total due (pending installments) for all memberships
        $totalDue = 0;
        $totalPenalty = 0;
        foreach ($memberships as $m) {
            foreach ($m->installments ?? [] as $inst) {
                if (! $inst->paid) {
                    $totalDue += max(0, (float) $inst->amount - (float) $inst->paid_amount);
                    $totalPenalty += (float) ($inst->penalty ?? 0);
                }
            }
        }

        // Build a running balance: start with total due before the first payment
        // Compute opening due before date_from
        $openingPaymentTotal = (float) Payment::whereIn('membership_id', $membershipIds)
            ->where('status', 'success')
            ->whereDate('payment_date', '<', $dateFrom)
            ->sum('amount');

        $totalInstallmentAmount = 0;
        foreach ($memberships as $m) {
            foreach ($m->installments ?? [] as $inst) {
                $totalInstallmentAmount += (float) $inst->amount;
            }
        }

        $openingBalance = max(0, $totalInstallmentAmount - $openingPaymentTotal);

        // Transform rows
        $runningBalance = $openingBalance;
        $rows = collect($paginated->items())->map(function (Payment $payment) use (&$runningBalance) {
            $receipt = $payment->receipt;
            $installment = $payment->installment;
            $membership = $payment->membership;
            $amount = (float) $payment->amount;

            $runningBalance = max(0, $runningBalance - $amount);

            return [
                'id' => $payment->id,
                'date' => $payment->payment_date?->toDateString(),
                'receipt_no' => $receipt?->receipt_no ?? 'N/A',
                'voucher_no' => $receipt?->voucher?->voucher_no ?? null,
                'membership_id' => $membership?->id,
                'membership_no' => $membership?->membership_no ?? 'N/A',
                'scheme_name' => $membership?->scheme?->name ?? 'N/A',
                'scheme_code' => $membership?->scheme?->code ?? '',
                'installment_no' => $installment?->installment_no,
                'installment_due_date' => $installment?->due_date?->toDateString(),
                'amount' => $amount,
                'gateway' => $payment->gateway ?? 'cash',
                'balance' => round($runningBalance, 2),
            ];
        });

        // Map memberships for the frontend selector
        $membershipOptions = $memberships->map(fn ($m) => [
            'id' => $m->id,
            'membership_no' => $m->membership_no,
            'scheme_name' => $m->scheme?->name ?? 'N/A',
            'scheme_code' => $m->scheme?->code ?? '',
            'status' => $m->status,
            'total_paid' => (float) $m->total_paid,
            'installment_value' => (float) ($m->installments->first()?->amount ?? $m->schemeTerm('installment_value', 0)),
            'total_installments' => $m->installments->count(),
            'paid_installments' => $m->installments->where('paid', true)->count(),
        ]);

        // Compute per-membership dues
        $membershipDues = $memberships->mapWithKeys(fn ($m) => [
            $m->id => [
                'total_installments' => $m->installments->count(),
                'paid_installments' => $m->installments->where('paid', true)->count(),
                'total_amount' => $m->installments->sum(fn ($i) => (float) $i->amount),
                'paid_amount' => (float) $m->total_paid,
                'due_amount' => $m->installments->sum(fn ($i) => !$i->paid ? max(0, (float) $i->amount - (float) $i->paid_amount) : 0),
                'penalty_amount' => $m->installments->sum(fn ($i) => !$i->paid ? (float) ($i->penalty ?? 0) : 0),
            ],
        ]);

        return [
            'data' => $rows,
            'memberships' => $membershipOptions,
            'membership_dues' => $membershipDues,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'summary' => [
                'customer' => $customer ? [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'mobile' => $customer->mobile,
                ] : null,
                'total_paid' => round($totalPaid, 2),
                'total_due' => round($totalDue, 2),
                'total_penalty' => round($totalPenalty, 2),
                'opening_balance' => round($openingBalance, 2),
                'membership_count' => $memberships->count(),
            ],
            'filters' => [
                'customer_id' => $customerId,
                'membership_id' => $membershipId,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'status' => $status,
            ],
        ];
    }

    public function pendingInstallments(Request $request): array
    {
        $customerId = $request->input('customer_id');
        $schemeId = $request->input('scheme_id');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $query = Installment::query()
            ->with(['membership.customer', 'membership.scheme'])
            ->where('paid', false);

        if (! empty($customerId)) {
            $query->whereHas('membership', fn ($q) => $q->where('customer_id', (int) $customerId));
        }

        if (! empty($schemeId)) {
            $query->whereHas('membership', fn ($q) => $q->where('scheme_id', (int) $schemeId));
        }

        if (! empty($dateFrom)) {
            $query->whereDate('due_date', '>=', $dateFrom);
        }

        if (! empty($dateTo)) {
            $query->whereDate('due_date', '<=', $dateTo);
        }

        $query->orderBy('due_date', 'asc')->orderBy('installment_no', 'asc');

        $perPage = max(1, min((int) $request->input('per_page', 50), 200));
        $paginated = $query->paginate($perPage);

        $rows = collect($paginated->items())->map(function (Installment $inst) {
            $membership = $inst->membership;
            $pendingAmount = max(0, (float) $inst->amount - (float) ($inst->paid_amount ?? 0));
            $penalty = (float) ($inst->penalty ?? 0);

            return [
                'id' => $inst->id,
                'installment_no' => $inst->installment_no,
                'due_date' => $inst->due_date?->toDateString(),
                'amount' => (float) $inst->amount,
                'paid_amount' => (float) ($inst->paid_amount ?? 0),
                'pending_amount' => round($pendingAmount, 2),
                'penalty' => $penalty,
                'total_due' => round($pendingAmount + $penalty, 2),
                'customer_name' => $membership?->customer?->name ?? 'Unknown',
                'customer_mobile' => $membership?->customer?->mobile ?? '',
                'scheme_name' => $membership?->scheme?->name ?? 'N/A',
                'scheme_code' => $membership?->scheme?->code ?? '',
                'membership_no' => $membership?->membership_no ?? 'N/A',
                'membership_id' => $membership?->id,
                'customer_id' => $membership?->customer?->id,
            ];
        });

        $totalsQuery = Installment::query()->where('paid', false);

        if (! empty($customerId)) {
            $totalsQuery->whereHas('membership', fn ($q) => $q->where('customer_id', (int) $customerId));
        }

        if (! empty($schemeId)) {
            $totalsQuery->whereHas('membership', fn ($q) => $q->where('scheme_id', (int) $schemeId));
        }

        if (! empty($dateFrom)) {
            $totalsQuery->whereDate('due_date', '>=', $dateFrom);
        }

        if (! empty($dateTo)) {
            $totalsQuery->whereDate('due_date', '<=', $dateTo);
        }

        $totalCount = (clone $totalsQuery)->count();
        $totalPendingAmount = 0.0;
        $totalPenalty = 0.0;

        $allRows = (clone $totalsQuery)->get(['amount', 'paid_amount', 'penalty']);
        foreach ($allRows as $inst) {
            $pending = max(0, (float) $inst->amount - (float) ($inst->paid_amount ?? 0));
            $totalPendingAmount += $pending;
            $totalPenalty += (float) ($inst->penalty ?? 0);
        }

        return [
            'data' => $rows,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'summary' => [
                'total_pending' => $totalCount,
                'total_pending_amount' => round($totalPendingAmount, 2),
                'total_penalty' => round($totalPenalty, 2),
                'total_due' => round($totalPendingAmount + $totalPenalty, 2),
            ],
            'filters' => [
                'customer_id' => $customerId,
                'scheme_id' => $schemeId,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ];
    }

    public function overdueInstallments(Request $request): array
    {
        $customerId = $request->input('customer_id');
        $branchId = $request->input('branch_id');
        $minDaysOverdue = max(0, (int) $request->input('min_days_overdue', 0));
        $today = now()->toDateString();

        $query = Installment::query()
            ->with(['membership.customer', 'membership.scheme', 'membership.payments.receipt.branch'])
            ->where('paid', false)
            ->whereDate('due_date', '<', $today);

        if (! empty($customerId)) {
            $query->whereHas('membership', fn ($q) => $q->where('customer_id', (int) $customerId));
        }

        if ($minDaysOverdue > 0) {
            $query->whereDate('due_date', '<=', now()->subDays($minDaysOverdue)->toDateString());
        }

        if (! empty($branchId)) {
            $query->whereHas('membership.payments.receipt', fn ($q) => $q->where('branch_id', (int) $branchId));
        }

        $query->orderBy('due_date', 'asc')->orderBy('installment_no', 'asc');

        $perPage = max(1, min((int) $request->input('per_page', 50), 200));
        $paginated = $query->paginate($perPage);

        $rows = collect($paginated->items())->map(function (Installment $inst) {
            $membership = $inst->membership;
            $daysOverdue = $inst->due_date ? (int) now()->diffInDays($inst->due_date, false) : 0;
            $daysOverdue = max(0, $daysOverdue);
            $pendingAmount = max(0, (float) $inst->amount - (float) ($inst->paid_amount ?? 0));
            $penalty = (float) ($inst->penalty ?? 0);

            return [
                'id' => $inst->id,
                'installment_no' => $inst->installment_no,
                'due_date' => $inst->due_date?->toDateString(),
                'days_overdue' => $daysOverdue,
                'amount' => (float) $inst->amount,
                'paid_amount' => (float) ($inst->paid_amount ?? 0),
                'pending_amount' => round($pendingAmount, 2),
                'penalty' => $penalty,
                'total_due' => round($pendingAmount + $penalty, 2),
                'customer_name' => $membership?->customer?->name ?? 'Unknown',
                'customer_mobile' => $membership?->customer?->mobile ?? '',
                'scheme_name' => $membership?->scheme?->name ?? 'N/A',
                'scheme_code' => $membership?->scheme?->code ?? '',
                'membership_no' => $membership?->membership_no ?? 'N/A',
                'membership_id' => $membership?->id,
                'customer_id' => $membership?->customer?->id,
                'branch_name' => $membership?->payments?->first()?->receipt?->branch?->name ?? '',
            ];
        });

        // Compute summary totals
        $totalsQuery = Installment::query()
            ->where('paid', false)
            ->whereDate('due_date', '<', $today);

        if (! empty($customerId)) {
            $totalsQuery->whereHas('membership', fn ($q) => $q->where('customer_id', (int) $customerId));
        }

        if ($minDaysOverdue > 0) {
            $totalsQuery->whereDate('due_date', '<=', now()->subDays($minDaysOverdue)->toDateString());
        }

        if (! empty($branchId)) {
            $totalsQuery->whereHas('membership.payments.receipt', fn ($q) => $q->where('branch_id', (int) $branchId));
        }

        $totalCount = (clone $totalsQuery)->count();
        $totalPendingAmount = 0.0;
        $totalPenalty = 0.0;

        $allRows = (clone $totalsQuery)->get(['amount', 'paid_amount', 'penalty']);
        foreach ($allRows as $inst) {
            $pending = max(0, (float) $inst->amount - (float) ($inst->paid_amount ?? 0));
            $totalPendingAmount += $pending;
            $totalPenalty += (float) ($inst->penalty ?? 0);
        }

        return [
            'data' => $rows,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'summary' => [
                'total_overdue' => $totalCount,
                'total_pending_amount' => round($totalPendingAmount, 2),
                'total_penalty' => round($totalPenalty, 2),
                'total_due' => round($totalPendingAmount + $totalPenalty, 2),
            ],
            'filters' => [
                'customer_id' => $customerId,
                'branch_id' => $branchId,
                'min_days_overdue' => $minDaysOverdue,
            ],
        ];
    }

    public function dailyCollectionCsv(Request $request): StreamedResponse
    {
        $dateFrom = $request->input('date_from', now()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());
        $gateway = $request->input('gateway');
        $branchId = $request->input('branch_id');

        $query = Payment::query()
            ->with(['membership.customer', 'membership.scheme', 'receipt.branch'])
            ->where('status', 'success')
            ->whereDate('payment_date', '>=', $dateFrom)
            ->whereDate('payment_date', '<=', $dateTo)
            ->orderBy('payment_date', 'desc')
            ->orderBy('id', 'desc');

        if (! empty($gateway)) {
            $query->where('gateway', $gateway);
        }

        if (! empty($branchId)) {
            $query->whereHas('receipt', fn ($q) => $q->where('branch_id', $branchId));
        }

        $payments = $query->get();

        $headers = [
            'Receipt No', 'Date', 'Customer Name', 'Customer Mobile',
            'Scheme', 'Membership No', 'Payment Mode', 'Transaction ID',
            'Branch', 'Amount',
        ];

        $stream = function () use ($headers, $payments) {
            $stream = fopen('php://output', 'w');

            // BOM for Excel UTF-8 compatibility
            fprintf($stream, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($stream, $headers);

            foreach ($payments as $payment) {
                $membership = $payment->membership;

                fputcsv($stream, [
                    $payment->receipt?->receipt_no ?? 'N/A',
                    $payment->payment_date?->toDateString() ?? '',
                    $membership?->customer?->name ?? 'Unknown',
                    $membership?->customer?->mobile ?? '',
                    ($membership?->scheme?->name ?? '') . ' (' . ($membership?->scheme?->code ?? '') . ')',
                    $membership?->membership_no ?? 'N/A',
                    $payment->gateway ?? 'cash',
                    $payment->transaction_id ?? '',
                    $payment->receipt?->branch?->name ?? '',
                    (float) $payment->amount,
                ]);
            }

            fclose($stream);
        };

        $filename = 'daily-collection-' . $dateFrom . '-to-' . $dateTo . '.csv';

        return Response::stream($stream, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    public function dailyCollectionPdf(Request $request): \Barryvdh\DomPDF\PDF
    {
        $dateFrom = $request->input('date_from', now()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());
        $gateway = $request->input('gateway');
        $branchId = $request->input('branch_id');

        $query = Payment::query()
            ->with(['membership.customer', 'membership.scheme', 'receipt.branch'])
            ->where('status', 'success')
            ->whereDate('payment_date', '>=', $dateFrom)
            ->whereDate('payment_date', '<=', $dateTo)
            ->orderBy('payment_date', 'asc')
            ->orderBy('id', 'asc');

        if (! empty($gateway)) {
            $query->where('gateway', $gateway);
        }

        if (! empty($branchId)) {
            $query->whereHas('receipt', fn ($q) => $q->where('branch_id', $branchId));
        }

        $payments = $query->get();

        // Compute mode totals
        $totalsByGateway = $payments->groupBy(fn ($p) => $p->gateway ?: 'cash')->map(fn ($group) => $group->sum('amount'));
        $grandTotal = (float) $payments->sum('amount');

        $modeTotals = [
            'cash' => (float) ($totalsByGateway['cash'] ?? 0),
            'upi' => (float) ($totalsByGateway['upi'] ?? 0),
            'card' => (float) ($totalsByGateway['card'] ?? 0),
            'cheque' => (float) ($totalsByGateway['cheque'] ?? 0),
            'other' => 0.0,
        ];

        foreach ($totalsByGateway as $gw => $total) {
            $gw = strtolower(trim((string) $gw));
            if (! array_key_exists($gw, $modeTotals)) {
                $modeTotals['other'] += (float) $total;
            }
        }

        $modeTotals['grand_total'] = $grandTotal;
        $modeTotals['transaction_count'] = $payments->count();

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.daily-collection', [
            'payments' => $payments,
            'modeTotals' => $modeTotals,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'generatedAt' => now()->format('d-m-Y H:i'),
        ]);

        return $pdf;
    }
}
