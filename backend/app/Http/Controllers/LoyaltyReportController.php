<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\LoyaltyLedger;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LoyaltyReportController extends Controller
{
    public function ledger(Request $request)
    {
        $query = Customer::query()->with(['user.branches'])
            ->whereNotNull('loyalty_card_no')
            ->where('loyalty_card_no', '!=', '');

        $nonZeroOnly = $request->has('non_zero_only') ? $request->boolean('non_zero_only') : true;

        if ($nonZeroOnly) {
            $query->where('loyalty_points_balance', '!=', 0)
                  ->whereNotNull('loyalty_points_balance');
        }

        if ($request->filled('branch')) {
            $branchId = $request->branch;
            $query->whereHas('user.branches', function ($q) use ($branchId) {
                $q->where('branches.id', $branchId);
            });
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('mobile', 'ilike', "%{$search}%")
                  ->orWhere('loyalty_card_no', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('customers.category', $request->category);
        }

        // We can filter by branch if customers have branch_id, but there's no branch_id in Customer model.
        // Assuming branch is not strictly tied to customer or we ignore it for now unless we add a join.

        $fromDate = $request->from_date;
        $toDate = $request->to_date;

        $perPage = $request->input('per_page', 10);
        $sortBy = $request->input('sort_by', 'loyalty_card_no');
        $sortOrder = $request->input('sort_order', 'asc');

        // Allow sorting by aggregated fields? It's complex, we'd need subqueries.
        // Let's load the ledger aggregates for the date range
        $customers = $query->orderBy($sortBy, $sortOrder)->paginate($perPage);

        $customerIds = $customers->pluck('id')->toArray();

        // Calculate Opening Balance (before fromDate)
        $openingBalances = [];
        if ($fromDate) {
            $openingQuery = LoyaltyLedger::select('customer_id', 
                DB::raw("SUM(CASE WHEN transaction_type IN ('Added', 'add', 'Credit') THEN points ELSE 0 END) - SUM(CASE WHEN transaction_type IN ('Redeemed', 'redeem', 'Debit') THEN points ELSE 0 END) as opening")
            )
            ->whereIn('customer_id', $customerIds)
            ->whereDate('transaction_date', '<', $fromDate)
            ->groupBy('customer_id')
            ->get();

            foreach ($openingQuery as $item) {
                $openingBalances[$item->customer_id] = $item->opening;
            }
        }

        // Calculate Added & Redeemed in range
        $rangeQuery = LoyaltyLedger::select('customer_id',
            DB::raw("SUM(CASE WHEN transaction_type IN ('Added', 'add', 'Credit') THEN points ELSE 0 END) as added"),
            DB::raw("SUM(CASE WHEN transaction_type IN ('Redeemed', 'redeem', 'Debit') THEN points ELSE 0 END) as redeemed")
        )
        ->whereIn('customer_id', $customerIds);

        if ($fromDate) {
            $rangeQuery->whereDate('transaction_date', '>=', $fromDate);
        }
        if ($toDate) {
            $rangeQuery->whereDate('transaction_date', '<=', $toDate);
        }

        $rangeStats = $rangeQuery->groupBy('customer_id')->get()->keyBy('customer_id');

        $customers->getCollection()->transform(function ($customer) use ($openingBalances, $rangeStats, $fromDate) {
            $baseOpening = $customer->opening_points ?? 0;
            $opening = $fromDate ? ($baseOpening + ($openingBalances[$customer->id] ?? 0)) : $baseOpening;
            
            $stats = $rangeStats->get($customer->id);
            $added = $stats ? $stats->added : 0;
            $redeemed = $stats ? $stats->redeemed : 0;
            $closing = $opening + $added - $redeemed;

            // If no fromDate, ensure closing matches current balance exactly
            if (!$fromDate) {
                $closing = $customer->loyalty_points_balance ?? $closing;
            }

            $branchName = $customer->user?->branches?->first()?->name ?? 'N/A';

            return [
                'id' => $customer->id,
                'cardNo' => $customer->loyalty_card_no,
                'customer' => $customer->name,
                'mobile' => $customer->mobile,
                'category' => $customer->category,
                'branch' => $branchName,
                'opening_points' => $customer->opening_points ?? 0,
                'opening' => number_format((float)$opening, 2, '.', ''),
                'added' => number_format((float)$added, 2, '.', ''),
                'redeemed' => number_format((float)$redeemed, 2, '.', ''),
                'closing' => number_format((float)$closing, 2, '.', ''),
            ];
        });

        // Summary Statistics should reflect the filters (except pagination)
        $summaryQuery = clone $query;
        $customerIdsForSummary = $summaryQuery->pluck('id')->toArray();

        $rangeStatsQuery = LoyaltyLedger::whereIn('customer_id', $customerIdsForSummary);
        if ($fromDate) $rangeStatsQuery->whereDate('transaction_date', '>=', $fromDate);
        if ($toDate) $rangeStatsQuery->whereDate('transaction_date', '<=', $toDate);

        $rangeTotals = $rangeStatsQuery->select(
            DB::raw("SUM(CASE WHEN transaction_type IN ('Added', 'add', 'Credit') THEN points ELSE 0 END) as total_added"),
            DB::raw("SUM(CASE WHEN transaction_type IN ('Redeemed', 'redeem', 'Debit') THEN points ELSE 0 END) as total_redeemed")
        )->first();

        $openingPointsBeforeFromDate = 0;
        if ($fromDate && count($customerIdsForSummary) > 0) {
            $openingPointsBeforeFromDate = LoyaltyLedger::whereIn('customer_id', $customerIdsForSummary)
                ->whereDate('transaction_date', '<', $fromDate)
                ->select(
                    DB::raw("SUM(CASE WHEN transaction_type IN ('Added', 'add', 'Credit') THEN points ELSE 0 END) - SUM(CASE WHEN transaction_type IN ('Redeemed', 'redeem', 'Debit') THEN points ELSE 0 END) as total_opening")
                )->value('total_opening') ?? 0;
        }

        $totalBaseOpeningPoints = $summaryQuery->sum('opening_points') ?? 0;
        $totalOpeningPoints = $totalBaseOpeningPoints + $openingPointsBeforeFromDate;
        $rangeAdded = $rangeTotals->total_added ?? 0;
        $rangeRedeemed = $rangeTotals->total_redeemed ?? 0;
        $totalPoints = $totalOpeningPoints + $rangeAdded - $rangeRedeemed;

        $summary = [
            'total_customers' => count($customerIdsForSummary),
            'total_opening_points' => number_format((float)$totalOpeningPoints, 2, '.', ''),
            'total_points' => number_format((float)$totalPoints, 2, '.', ''),
            'range_added' => number_format((float)$rangeAdded, 2, '.', ''),
            'range_redeemed' => number_format((float)$rangeRedeemed, 2, '.', ''),
        ];


        return response()->json([
            'data' => $customers->items(),
            'total' => $customers->total(),
            'current_page' => $customers->currentPage(),
            'per_page' => $customers->perPage(),
            'last_page' => $customers->lastPage(),
            'summary' => $summary,
        ]);
    }

    public function categoryWise(Request $request)
    {
        $fromDate = $request->from_date;
        $toDate = $request->to_date;

        $query = DB::table('customers')
            ->join('loyalty_card_categories', 'customers.category', '=', 'loyalty_card_categories.category_code')
            ->whereNotNull('customers.category')
            ->where('customers.category', '!=', '')
            ->groupBy('loyalty_card_categories.category_name', 'customers.category')
            ->select(
                'loyalty_card_categories.category_name as category',
                'customers.category as category_code',
                DB::raw('COUNT(customers.id) as total_customers'),
                DB::raw('SUM(customers.loyalty_points_balance) as current_balance')
            );

        $categories = $query->get();

        // Calculate Range Stats if dates provided
        $rangeStats = collect();
        if ($fromDate || $toDate) {
            $ledgerQuery = DB::table('loyalty_ledgers')
                ->join('customers', 'loyalty_ledgers.customer_id', '=', 'customers.id')
                ->join('loyalty_card_categories', 'customers.category', '=', 'loyalty_card_categories.category_code')
                ->whereNotNull('customers.category')
                ->where('customers.category', '!=', '')
                ->select(
                    'loyalty_card_categories.category_name',
                    DB::raw("SUM(CASE WHEN transaction_type IN ('Added', 'add', 'Credit', 'Added Points') THEN points ELSE 0 END) as added"),
                    DB::raw("SUM(CASE WHEN transaction_type IN ('Redeemed', 'redeem', 'Debit', 'Redeemed Points') THEN points ELSE 0 END) as redeemed")
                );

            if ($fromDate) $ledgerQuery->whereDate('transaction_date', '>=', $fromDate);
            if ($toDate) $ledgerQuery->whereDate('transaction_date', '<=', $toDate);

            $rangeStats = $ledgerQuery->groupBy('loyalty_card_categories.category_name')->get()->keyBy('category_name');
        }

        $result = $categories->map(function($cat) use ($rangeStats) {
            $stats = $rangeStats->get($cat->category);
            return [
                'category' => $cat->category,
                'category_code' => $cat->category_code,
                'total_customers' => $cat->total_customers,
                'current_balance' => number_format((float)($cat->current_balance ?? 0), 2, '.', ''),
                'range_added' => number_format((float)($stats ? $stats->added : 0), 2, '.', ''),
                'range_redeemed' => number_format((float)($stats ? $stats->redeemed : 0), 2, '.', ''),
            ];
        });

        return response()->json($result);
    }

    public function giftAchiever(Request $request)
    {
        $minPoints = $request->input('min_points', 0);
        
        $query = Customer::whereNotNull('loyalty_card_no')
            ->where('loyalty_card_no', '!=', '');

        if ($minPoints > 0) {
            $query->where('loyalty_points_balance', '>=', $minPoints);
        }

        if ($request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('mobile', 'ilike', "%{$search}%")
                  ->orWhere('loyalty_card_no', 'ilike', "%{$search}%");
            });
        }

        $achievers = $query->orderBy('loyalty_points_balance', 'desc')->get();

        // Fetch Gift Definitions from Loyalty Setup (Category Level Setup)
        $setup = \App\Models\LoyaltySetup::orderByDesc('id')->first();
        $benefits = $setup ? (is_array($setup->category_level_setup) ? $setup->category_level_setup : []) : [];

        $result = $achievers->map(function($customer) use ($benefits) {
            $points = (float)$customer->loyalty_points_balance;
            $currentLevel = null;
            $nextLevel = null;
            $currentIndex = -1;

            foreach ($benefits as $index => $benefit) {
                $from = (float)($benefit['from_points'] ?? 0);
                $to = (float)($benefit['to_points'] ?? 999999);
                
                if ($points >= $from && $points <= $to) {
                    $currentLevel = $benefit;
                    $nextLevel = $benefits[$index + 1] ?? null;
                    $currentIndex = $index;
                    break;
                }
            }

            // Logic Adjustment: 
            // Target Level: The level the customer is currently in (striving for its gift).
            // Achieved Level: The level the customer just completed (passed its 'to_points').
            
            $targetLevelName = $currentLevel['level_name'] ?? 'None';
            $achievedLevelName = 'Basic';
            $giftAchieved = 'No Gift';
            
            if ($currentIndex > 0) {
                // They have moved past at least the first level
                $achievedLevelName = $benefits[$currentIndex - 1]['level_name'] ?? 'Basic';
                $giftAchieved = $benefits[$currentIndex - 1]['gift_description'] ?? 'No Gift';
            } else if ($currentIndex === 0 && $currentLevel) {
                // They are in the first level. Have they hit its target?
                $target = (float)($currentLevel['to_points'] ?? 0);
                if ($points >= $target && $target > 0) {
                    $achievedLevelName = $currentLevel['level_name'] ?? 'Basic';
                    $giftAchieved = $currentLevel['gift_description'] ?? 'No Gift';
                    
                    // Since they hit the target, they are technically targeting the next level now
                    if ($nextLevel) {
                        $targetLevelName = $nextLevel['level_name'];
                    }
                }
            }

            // Try to find achievement date from Activity Logs
            $achievementDate = \App\Models\ActivityLog::where('sub_module', 'Gift Achievement')
                ->where('description', 'like', "%{$customer->loyalty_card_no}%")
                ->orWhere(function($q) use ($customer, $giftAchieved) {
                    if ($giftAchieved !== 'No Gift') {
                        $q->where('description', 'like', "%{$customer->name}%")
                          ->where('description', 'like', "%{$giftAchieved}%");
                    } else {
                        $q->whereRaw('1=0');
                    }
                })
                ->latest()
                ->value('created_at');
                
            if (!$achievementDate && $giftAchieved !== 'No Gift') {
                 $achievementDate = \App\Models\ActivityLog::where('sub_module', 'Auto Upgrade')
                    ->where(function($q) use ($customer) {
                        $q->where('description', 'like', "%{$customer->loyalty_card_no}%")
                          ->orWhere('description', 'like', "%{$customer->name}%");
                    })
                    ->where('description', 'like', "%{$achievedLevelName}%")
                    ->latest()
                    ->value('created_at');
            }

            if (!$achievementDate && $giftAchieved !== 'No Gift') {
                $achievementDate = $customer->updated_at;
            }

            return [
                'id' => $customer->id,
                'cardNo' => $customer->loyalty_card_no,
                'customer' => $customer->name,
                'mobile' => $customer->mobile,
                'achieved_level' => $achievedLevelName,
                'points' => number_format($points, 2, '.', ''),
                'target_level' => $targetLevelName,
                'target_points' => number_format((float)($currentLevel['to_points'] ?? 0), 2, '.', ''),
                'gift_achieved' => $giftAchieved,
                'gift_status' => $customer->gift_status ?? 'Pending',
                'achieved_date' => $achievementDate ? $achievementDate->format('Y-m-d') : null
            ];
        });

        return response()->json($result);
    }

    public function updateCustomerGiftStatus(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:customers,id',
            'mobile' => 'required|string|size:10',
            'gift_status' => 'required|in:Pending,Delivered'
        ]);

        $customer = Customer::findOrFail($request->id);
        $oldMobile = $customer->mobile;
        $oldStatus = $customer->gift_status;

        $customer->mobile = $request->mobile;
        $customer->gift_status = $request->gift_status;
        $customer->save();

        ActivityLog::create([
            'user_id' => \Illuminate\Support\Facades\Auth::id() ?? 1,
            'module' => 'Loyalty Card',
            'sub_module' => 'Gift Achievement',
            'action' => 'Update',
            'description' => "Updated customer {$customer->name} gift status to {$request->gift_status} and mobile to {$request->mobile}",
            'metadata' => [
                'old_mobile' => $oldMobile,
                'new_mobile' => $request->mobile,
                'old_status' => $oldStatus,
                'new_status' => $request->gift_status
            ]
        ]);

        return response()->json(['success' => true, 'message' => 'Status updated successfully']);
    }

    public function ledgerDetails(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);
        
        $query = LoyaltyLedger::where('customer_id', $id)
            ->orderBy('transaction_date', 'asc')
            ->orderBy('id', 'asc');

        if ($request->filled('from_date')) {
            $query->whereDate('transaction_date', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->whereDate('transaction_date', '<=', $request->to_date);
        }

        $ledgers = $query->get();

        // Pre-fetch related sale data for imports
        $vouNos = $ledgers->where('reference_type', 'Import')->pluck('reference_id')->unique();
        $saleData = \App\Models\LoyaltySaleData::whereIn('vou_no', $vouNos)->get()->keyBy('vou_no');

        // Calculate running balance. We need opening balance first if from_date is provided.
        $runningBalance = 0;
        if ($request->filled('from_date')) {
            $openingPoints = LoyaltyLedger::where('customer_id', $id)
                ->whereDate('transaction_date', '<', $request->from_date)
                ->select(
                    DB::raw("SUM(CASE WHEN transaction_type IN ('Added', 'add', 'Credit') THEN points ELSE 0 END) - SUM(CASE WHEN transaction_type IN ('Redeemed', 'redeem', 'Debit') THEN points ELSE 0 END) as bal")
                )->value('bal');
            $runningBalance = (float)$openingPoints;
        }

        $details = [];
        if ($runningBalance > 0 || $request->filled('from_date')) {
             $details[] = [
                 'id' => 0,
                 'date' => $request->from_date ?? 'Beginning',
                 'description' => 'Opening Balance',
                 'type' => 'Added',
                 'points' => number_format($runningBalance, 2, '.', ''),
                 'balance' => number_format($runningBalance, 2, '.', ''),
                 'metal_name' => '-',
                 'gst_taxable_amt' => '-',
                 'net_wt' => '-',
             ];
        }

        foreach ($ledgers as $ledger) {
            $type = in_array(strtolower($ledger->transaction_type), ['redeem', 'redeemed', 'debit']) ? 'Redeemed' : 'Added';
            
            if ($type === 'Added') {
                $runningBalance += $ledger->points;
            } else {
                $runningBalance -= $ledger->points;
            }

            $sale = ($ledger->reference_type === 'Import') ? $saleData->get($ledger->reference_id) : null;

            $details[] = [
                'id' => $ledger->id,
                'date' => $ledger->transaction_date ? $ledger->transaction_date->format('Y-m-d') : null,
                'description' => $ledger->description ?? ($type . ' Points'),
                'type' => $type,
                'points' => number_format((float)$ledger->points, 2, '.', ''),
                'balance' => number_format((float)$runningBalance, 2, '.', ''),
                'metal_name' => $sale ? ($sale->metal_name . ($sale->carat ? ' (' . $sale->carat . ')' : '')) : '-',
                'gst_taxable_amt' => $sale ? number_format((float)$sale->gst_taxable_amt, 2, '.', '') : '-',
                'net_wt' => $sale ? number_format((float)$sale->net_wt, 3, '.', '') : '-',
            ];
        }

        return response()->json([
            'customer' => $customer->name,
            'cardNo' => $customer->loyalty_card_no,
            'mobile' => $customer->mobile,
            'branch' => $customer->user?->branches?->first()?->name ?? 'N/A',
            'ledgers' => $details
        ]);
    }

    public function recalculateBalances(Request $request)
    {
        return DB::transaction(function () {
            $customers = Customer::whereNotNull('loyalty_card_no')->get();
            $updatedCount = 0;

            foreach ($customers as $customer) {
                // Sum all Credits and Debits from the ledger
                $stats = LoyaltyLedger::where('customer_id', $customer->id)
                    ->select(
                        DB::raw("SUM(CASE WHEN transaction_type IN ('Added', 'add', 'Credit') THEN points ELSE 0 END) as total_added"),
                        DB::raw("SUM(CASE WHEN transaction_type IN ('Redeemed', 'redeem', 'Debit') THEN points ELSE 0 END) as total_redeemed")
                    )
                    ->first();

                $baseOpening = $customer->opening_points ?? 0;
                $newBalance = $baseOpening + ($stats->total_added ?? 0) - ($stats->total_redeemed ?? 0);
                $newLifetime = $baseOpening + ($stats->total_added ?? 0);

                // Only update if there's a difference
                if ($customer->loyalty_points_balance != $newBalance || $customer->lifetime_points != $newLifetime) {
                    $customer->update([
                        'loyalty_points_balance' => $newBalance,
                        'lifetime_points' => $newLifetime
                    ]);
                    $updatedCount++;
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Successfully synchronized balances for $updatedCount customers.",
                'total_customers' => $customers->count(),
                'updated_customers' => $updatedCount
            ]);
        });
    }
}
