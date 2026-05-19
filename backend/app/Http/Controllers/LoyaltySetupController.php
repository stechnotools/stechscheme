<?php

namespace App\Http\Controllers;

use App\Models\LoyaltySetup;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LoyaltySetupController extends Controller
{
    public function index()
    {
        $setups = LoyaltySetup::with('creator:id,name')->get();
        return response()->json(['data' => $setups]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'setup_code' => 'required|string|unique:loyalty_setups',
            'setup_name' => 'required|string',
            'status' => 'required|string',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'loyalty_program' => 'nullable|string',
            'currency' => 'nullable|string',
            'rounding_method' => 'nullable|string',
            'description' => 'nullable|string',
            'enable_loyalty_program' => 'boolean',
            'allow_earn_points' => 'boolean',
            'allow_redeem_points' => 'boolean',
            'allow_expiry' => 'boolean',
            'point_expiry_months' => 'nullable|integer',
            'point_calculation_on' => 'nullable|string',
            'point_value' => 'nullable|numeric',
            'min_redeem_points' => 'nullable|numeric',
            'max_redeem_points_per_txn' => 'nullable|numeric',
            'allow_partial_redemption' => 'boolean',
            'allow_redemption_on_discounted' => 'boolean',
            'redemption_validation' => 'nullable|string',
            'excluded_categories' => 'nullable|array',
            'notify_on_credit' => 'boolean',
            'notify_on_redemption' => 'boolean',
            'notify_before_expiry' => 'boolean',
            'points_setup_overall' => 'nullable|array',
            'group_wise_points_setup' => 'nullable|array',
            'category_level_setup' => 'nullable|array',
            'redeem_benefits_setup' => 'nullable|array',
            'others_setup' => 'nullable|array',
            'notes' => 'nullable|string',
            'points_for_every_wt_global' => 'nullable|numeric',
            'points_to_be_earned_wt_global' => 'nullable|numeric',
            'allow_introducer_points' => 'boolean',
            'introducer_benefit_setup' => 'nullable|array',
        ]);

        $validated['created_by'] = Auth::id();
        $setup = LoyaltySetup::create($validated);

        ActivityLog::create([
            'user_id' => Auth::id(),
            'module' => 'Loyalty Management',
            'sub_module' => 'Loyalty Setup Master',
            'action' => 'Create',
            'description' => "Created Loyalty Setup: {$setup->setup_name} ({$setup->setup_code})",
            'metadata' => $setup->toArray()
        ]);

        return response()->json(['message' => 'Loyalty setup created successfully', 'data' => $setup]);
    }

    public function update(Request $request, $id)
    {
        $setup = LoyaltySetup::findOrFail($id);

        $validated = $request->validate([
            'setup_code' => 'required|string|unique:loyalty_setups,setup_code,' . $id,
            'setup_name' => 'required|string',
            'status' => 'required|string',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'loyalty_program' => 'nullable|string',
            'currency' => 'nullable|string',
            'rounding_method' => 'nullable|string',
            'description' => 'nullable|string',
            'enable_loyalty_program' => 'boolean',
            'allow_earn_points' => 'boolean',
            'allow_redeem_points' => 'boolean',
            'allow_expiry' => 'boolean',
            'point_expiry_months' => 'nullable|integer',
            'point_calculation_on' => 'nullable|string',
            'point_value' => 'nullable|numeric',
            'min_redeem_points' => 'nullable|numeric',
            'max_redeem_points_per_txn' => 'nullable|numeric',
            'allow_partial_redemption' => 'boolean',
            'allow_redemption_on_discounted' => 'boolean',
            'redemption_validation' => 'nullable|string',
            'excluded_categories' => 'nullable|array',
            'notify_on_credit' => 'boolean',
            'notify_on_redemption' => 'boolean',
            'notify_before_expiry' => 'boolean',
            'points_setup_overall' => 'nullable|array',
            'group_wise_points_setup' => 'nullable|array',
            'category_level_setup' => 'nullable|array',
            'redeem_benefits_setup' => 'nullable|array',
            'others_setup' => 'nullable|array',
            'notes' => 'nullable|string',
            'points_for_every_wt_global' => 'nullable|numeric',
            'points_to_be_earned_wt_global' => 'nullable|numeric',
            'allow_introducer_points' => 'boolean',
            'introducer_benefit_setup' => 'nullable|array',
        ]);

        $oldValues = $setup->toArray();
        $validated['updated_by'] = Auth::id();
        $setup->update($validated);

        ActivityLog::create([
            'user_id' => Auth::id(),
            'module' => 'Loyalty Management',
            'sub_module' => 'Loyalty Setup Master',
            'action' => 'Update',
            'description' => "Updated Loyalty Setup: {$setup->setup_name}",
            'metadata' => [
                'old' => $oldValues,
                'new' => $setup->toArray()
            ]
        ]);

        return response()->json(['message' => 'Loyalty setup updated successfully', 'data' => $setup]);
    }

    public function destroy($id)
    {
        $setup = LoyaltySetup::findOrFail($id);
        $setupName = $setup->setup_name;
        $setup->delete();

        ActivityLog::create([
            'user_id' => Auth::id(),
            'module' => 'Loyalty Management',
            'sub_module' => 'Loyalty Setup Master',
            'action' => 'Delete',
            'description' => "Deleted Loyalty Setup: {$setupName}",
            'metadata' => ['id' => $id, 'name' => $setupName]
        ]);

        return response()->json(['message' => 'Loyalty setup deleted successfully']);
    }

    public function logs()
    {
        $logs = ActivityLog::with('user:id,name')
            ->where('module', 'Loyalty Management')
            ->where('sub_module', 'Loyalty Setup Master')
            ->latest()
            ->get();
            
        return response()->json(['data' => $logs]);
    }
}
