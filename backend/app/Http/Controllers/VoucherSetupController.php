<?php

namespace App\Http\Controllers;

use App\Models\VoucherSetup;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VoucherSetupController extends Controller
{
    public function index()
    {
        $vouchers = VoucherSetup::with('user:id,name')->get();
        return response()->json(['data' => $vouchers]);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'prefix' => 'nullable|string',
            'start_no' => 'required|numeric',
        ]);

        $voucher = VoucherSetup::findOrFail($id);
        $oldPrefix = $voucher->prefix;
        $oldStartNo = $voucher->start_no;

        $voucher->prefix = $request->prefix;
        $voucher->start_no = (int) $request->start_no;
        $voucher->updated_by = Auth::id();
        $voucher->save();

        // Log the activity
        ActivityLog::create([
            'user_id' => Auth::id(),
            'module' => 'Digital Metal',
            'sub_module' => 'Voucher Setup',
            'action' => 'Update',
            'description' => "Updated {$voucher->transaction_type}: Prefix from '{$oldPrefix}' to '{$request->prefix}', Start No from '{$oldStartNo}' to '{$request->start_no}'",
            'metadata' => [
                'transaction_type' => $voucher->transaction_type,
                'old_values' => ['prefix' => $oldPrefix, 'start_no' => $oldStartNo],
                'new_values' => ['prefix' => $request->prefix, 'start_no' => $request->start_no]
            ]
        ]);

        return response()->json(['message' => 'Voucher setup updated successfully', 'data' => $voucher]);
    }

    public function logs()
    {
        $logs = ActivityLog::with('user:id,name')
            ->where('sub_module', 'Voucher Setup')
            ->latest()
            ->get();
            
        return response()->json(['data' => $logs]);
    }
}
