<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\LoyaltyLedger;
use App\Models\VoucherSetup;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class LoyaltyPointAdjustmentController extends Controller
{
    public function index(Request $request)
    {
        $query = LoyaltyLedger::with('customer')
            ->where('reference_type', 'Manual Adjustment');

        if ($request->search) {
            $query->where(function($q) use ($request) {
                $q->where('reference_id', 'like', "%{$request->search}%")
                  ->orWhereHas('customer', function($cq) use ($request) {
                      $cq->where('name', 'like', "%{$request->search}%")
                        ->orWhere('loyalty_card_no', 'like', "%{$request->search}%");
                  });
            });
        }

        $adjustments = $query->select(
                'reference_id as voucher_no',
                'transaction_date',
                'customer_id',
                DB::raw("SUM(CASE WHEN transaction_type = 'Credit' THEN points ELSE 0 END) as add_points"),
                DB::raw("SUM(CASE WHEN transaction_type = 'Debit' THEN points ELSE 0 END) as redeem_points")
            )
            ->groupBy('reference_id', 'transaction_date', 'customer_id')
            ->orderBy('transaction_date', 'desc')
            ->orderBy('reference_id', 'desc')
            ->paginate($request->per_page ?? 15);

        return response()->json($adjustments);
    }

    public function store(Request $request)
    {
        $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'voucher_no' => 'required|string',
            'transaction_date' => 'required|date',
            'address' => 'required|string',
            'add_points' => 'required|numeric|min:0',
            'redeem_points' => 'required|numeric|min:0',
            'narration' => 'nullable|string',
        ]);

        // Prevent duplicate voucher number insertions
        $exists = LoyaltyLedger::where('reference_id', $request->voucher_no)
            ->where('reference_type', 'Manual Adjustment')
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Duplicate voucher number. This voucher number has already been used.'
            ], 422);
        }

        $customer = Customer::findOrFail($request->customer_id);
        $newBalance = ($customer->loyalty_points_balance ?? 0) + $request->add_points - $request->redeem_points;
        if ($newBalance < 0) {
            return response()->json([
                'message' => 'Insufficient loyalty points balance. The customer has ' . number_format($customer->loyalty_points_balance, 2) . ' points, which is not enough to redeem ' . number_format($request->redeem_points, 2) . ' points.'
            ], 422);
        }

        return DB::transaction(function () use ($request) {
            $customer = Customer::findOrFail($request->customer_id);
            
            // Update customer KYC address
            \App\Models\CustomerKyc::updateOrCreate(
                ['customer_id' => $customer->id],
                ['address' => $request->address]
            );

            // 1. Create Add Entry if points > 0
            if ($request->add_points > 0) {
                LoyaltyLedger::create([
                    'customer_id' => $customer->id,
                    'transaction_type' => 'Credit',
                    'points' => $request->add_points,
                    'description' => $request->narration ?: 'Points Added (Manual Adjustment)',
                    'reference_id' => $request->voucher_no,
                    'reference_type' => 'Manual Adjustment',
                    'transaction_date' => $request->transaction_date,
                ]);

                $customer->loyalty_points_balance += $request->add_points;
                $customer->lifetime_points += $request->add_points;
            }

            // 2. Create Redeem Entry if points > 0
            if ($request->redeem_points > 0) {
                LoyaltyLedger::create([
                    'customer_id' => $customer->id,
                    'transaction_type' => 'Debit',
                    'points' => $request->redeem_points,
                    'description' => $request->narration ?: 'Points Redeemed (Manual Adjustment)',
                    'reference_id' => $request->voucher_no,
                    'reference_type' => 'Manual Adjustment',
                    'transaction_date' => $request->transaction_date,
                ]);

                $customer->loyalty_points_balance -= $request->redeem_points;
            }

            $customer->save();
            $achievement = $customer->checkAndApplyLoyaltyUpgrade();

            // 3. Log activity
            ActivityLog::create([
                'user_id' => Auth::id(),
                'module' => 'Loyalty Card',
                'sub_module' => 'Point Adjustment',
                'action' => 'Create',
                'description' => "Manual point adjustment for customer {$customer->name} (Card: {$customer->loyalty_card_no}). Added: {$request->add_points}, Redeemed: {$request->redeem_points}",
                'metadata' => [
                    'customer_id' => $customer->id,
                    'voucher_no' => $request->voucher_no,
                    'add_points' => $request->add_points,
                    'redeem_points' => $request->redeem_points,
                ]
            ]);

            // Auto-increment Voucher Number sequence in VoucherSetup if prefix matched
            if ($request->voucher_no) {
                $parts = preg_split('/[\s\/]+/', $request->voucher_no);
                if (count($parts) > 1) {
                    $prefix = $parts[0];
                    $numPart = (int)$parts[1];
                    $voucher = VoucherSetup::where('prefix', $prefix)->first();
                    if ($voucher) {
                        if ($numPart >= $voucher->start_no) {
                            $voucher->start_no = $numPart + 1;
                            $voucher->save();
                        }
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Loyalty points adjusted successfully',
                'new_balance' => $customer->loyalty_points_balance,
                'achievement' => $achievement
            ]);
        });
    }

    public function show($voucher_no)
    {
        $ledgers = LoyaltyLedger::with('customer')
            ->where('reference_id', $voucher_no)
            ->where('reference_type', 'Manual Adjustment')
            ->get();

        if ($ledgers->isEmpty()) {
            return response()->json([
                'message' => 'Adjustment record not found.'
            ], 404);
        }

        $first = $ledgers->first();
        $addPoints = 0;
        $redeemPoints = 0;
        $narration = '';

        foreach ($ledgers as $l) {
            if ($l->transaction_type === 'Credit') {
                $addPoints += $l->points;
            } elseif ($l->transaction_type === 'Debit') {
                $redeemPoints += $l->points;
            }
            if ($l->description && strpos($l->description, 'Manual Adjustment') === false) {
                $narration = $l->description;
            }
        }

        return response()->json([
            'voucher_no' => $first->reference_id,
            'transaction_date' => $first->transaction_date,
            'customer_id' => $first->customer_id,
            'customer' => $first->customer,
            'add_points' => $addPoints,
            'redeem_points' => $redeemPoints,
            'narration' => $narration ?: $first->description
        ]);
    }

    public function update(Request $request, $voucher_no)
    {
        $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'voucher_no' => 'required|string',
            'transaction_date' => 'required|date',
            'address' => 'required|string',
            'add_points' => 'required|numeric|min:0',
            'redeem_points' => 'required|numeric|min:0',
            'narration' => 'nullable|string',
        ]);

        if ($request->voucher_no !== $voucher_no) {
            $exists = LoyaltyLedger::where('reference_id', $request->voucher_no)
                ->where('reference_type', 'Manual Adjustment')
                ->exists();

            if ($exists) {
                return response()->json([
                    'message' => 'Duplicate voucher number. This voucher number has already been used.'
                ], 422);
            }
        }

        $customer = Customer::findOrFail($request->customer_id);
        $ledgers = LoyaltyLedger::where('reference_id', $voucher_no)
            ->where('reference_type', 'Manual Adjustment')
            ->get();

        $oldAddPoints = 0;
        $oldRedeemPoints = 0;
        foreach ($ledgers as $l) {
            if ($l->transaction_type === 'Credit') {
                $oldAddPoints += $l->points;
            } elseif ($l->transaction_type === 'Debit') {
                $oldRedeemPoints += $l->points;
            }
        }

        $potentialBalance = ($customer->loyalty_points_balance ?? 0) - $oldAddPoints + $oldRedeemPoints + $request->add_points - $request->redeem_points;
        if ($potentialBalance < 0) {
            return response()->json([
                'message' => 'Insufficient loyalty points balance. This update would result in a negative balance of ' . number_format($potentialBalance, 2) . ' points.'
            ], 422);
        }

        return DB::transaction(function () use ($request, $voucher_no) {
            $ledgers = LoyaltyLedger::where('reference_id', $voucher_no)
                ->where('reference_type', 'Manual Adjustment')
                ->get();

            if ($ledgers->isEmpty()) {
                return response()->json([
                    'message' => 'Adjustment record not found.'
                ], 404);
            }

            // 1. Revert existing balances from old ledgers
            foreach ($ledgers as $l) {
                $customer = Customer::findOrFail($l->customer_id);
                if ($l->transaction_type === 'Credit') {
                    $customer->loyalty_points_balance -= $l->points;
                    $customer->lifetime_points -= $l->points;
                } elseif ($l->transaction_type === 'Debit') {
                    $customer->loyalty_points_balance += $l->points;
                }
                $customer->save();
            }

            // Delete old ledgers
            LoyaltyLedger::where('reference_id', $voucher_no)
                ->where('reference_type', 'Manual Adjustment')
                ->delete();

            // 2. Create new entries and update customer balances
            $customer = Customer::findOrFail($request->customer_id);

            // Update customer KYC address
            \App\Models\CustomerKyc::updateOrCreate(
                ['customer_id' => $customer->id],
                ['address' => $request->address]
            );

            if ($request->add_points > 0) {
                LoyaltyLedger::create([
                    'customer_id' => $customer->id,
                    'transaction_type' => 'Credit',
                    'points' => $request->add_points,
                    'description' => $request->narration ?: 'Points Added (Manual Adjustment)',
                    'reference_id' => $request->voucher_no,
                    'reference_type' => 'Manual Adjustment',
                    'transaction_date' => $request->transaction_date,
                ]);

                $customer->loyalty_points_balance += $request->add_points;
                $customer->lifetime_points += $request->add_points;
            }

            if ($request->redeem_points > 0) {
                LoyaltyLedger::create([
                    'customer_id' => $customer->id,
                    'transaction_type' => 'Debit',
                    'points' => $request->redeem_points,
                    'description' => $request->narration ?: 'Points Redeemed (Manual Adjustment)',
                    'reference_id' => $request->voucher_no,
                    'reference_type' => 'Manual Adjustment',
                    'transaction_date' => $request->transaction_date,
                ]);

                $customer->loyalty_points_balance -= $request->redeem_points;
            }

            $customer->save();
            $achievement = $customer->checkAndApplyLoyaltyUpgrade();

            // 3. Log activity
            ActivityLog::create([
                'user_id' => Auth::id(),
                'module' => 'Loyalty Card',
                'sub_module' => 'Point Adjustment',
                'action' => 'Update',
                'description' => "Updated manual point adjustment for customer {$customer->name} (Card: {$customer->loyalty_card_no}). Voucher: {$request->voucher_no}, Added: {$request->add_points}, Redeemed: {$request->redeem_points}",
                'metadata' => [
                    'customer_id' => $customer->id,
                    'voucher_no' => $request->voucher_no,
                    'add_points' => $request->add_points,
                    'redeem_points' => $request->redeem_points,
                ]
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Loyalty points adjustment updated successfully',
                'new_balance' => $customer->loyalty_points_balance,
                'achievement' => $achievement
            ]);
        });
    }

    public function destroy($voucher_no)
    {
        return DB::transaction(function () use ($voucher_no) {
            $ledgers = LoyaltyLedger::where('reference_id', $voucher_no)
                ->where('reference_type', 'Manual Adjustment')
                ->get();

            if ($ledgers->isEmpty()) {
                return response()->json([
                    'message' => 'Adjustment record not found.'
                ], 404);
            }

            // Revert customer balances
            foreach ($ledgers as $l) {
                $customer = Customer::findOrFail($l->customer_id);
                if ($l->transaction_type === 'Credit') {
                    $customer->loyalty_points_balance -= $l->points;
                    $customer->lifetime_points -= $l->points;
                } elseif ($l->transaction_type === 'Debit') {
                    $customer->loyalty_points_balance += $l->points;
                }
                $customer->save();
            }

            // Log activity
            $first = $ledgers->first();
            $customer = Customer::find($first->customer_id);
            $custName = $customer ? $customer->name : 'N/A';
            
            ActivityLog::create([
                'user_id' => Auth::id(),
                'module' => 'Loyalty Card',
                'sub_module' => 'Point Adjustment',
                'action' => 'Delete',
                'description' => "Deleted manual point adjustment for customer {$custName}. Voucher: {$voucher_no}",
                'metadata' => [
                    'voucher_no' => $voucher_no,
                ]
            ]);

            // Delete ledgers
            LoyaltyLedger::where('reference_id', $voucher_no)
                ->where('reference_type', 'Manual Adjustment')
                ->delete();

            return response()->json([
                'success' => true,
                'message' => 'Loyalty points adjustment deleted successfully'
            ]);
        });
    }

    public function getNextVoucherNo(Request $request)
    {
        $prefix = $request->query('prefix');

        if ($prefix) {
            $setup = VoucherSetup::where('prefix', $prefix)->first();
        } else {
            $setup = VoucherSetup::where('transaction_type', 'Loyalty Card Redemption')
                ->orWhere('transaction_type', 'Loyalty Point Add/Redeem')
                ->first();
        }
        
        if (!$setup) {
            // Create default setup if not exists
            $setup = VoucherSetup::create([
                'transaction_type' => 'Loyalty Card Redemption',
                'prefix' => $prefix ?: 'LC',
                'start_no' => 1,
            ]);
        }

        // Find the last used number from ledger (matching either prefix/ or prefix )
        $lastLedger = LoyaltyLedger::where(function($query) use ($setup) {
                $query->where('reference_id', 'like', $setup->prefix . '/%')
                      ->orWhere('reference_id', 'like', $setup->prefix . ' %');
            })
            ->orderBy('id', 'desc')
            ->first();

        $nextNo = $setup->start_no;
        if ($lastLedger) {
            // Split by either whitespace or slash
            $parts = preg_split('/[\s\/]+/', $lastLedger->reference_id);
            if (count($parts) > 1) {
                $lastNo = (int) $parts[1];
                $nextNo = max($nextNo, $lastNo + 1);
            }
        }

        return response()->json([
            'prefix' => $setup->prefix,
            'next_no' => $nextNo
        ]);
    }
}
