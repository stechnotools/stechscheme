<?php

namespace App\Http\Controllers;

use App\Models\LoyaltyCardCategory;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LoyaltyCardCategoryController extends Controller
{
    public function index()
    {
        return response()->json(['data' => LoyaltyCardCategory::all()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_code' => 'required|string|unique:loyalty_card_categories',
            'category_name' => 'required|string',
            'description' => 'nullable|string',
            'category_type' => 'required|string',
            'card_color' => 'nullable|string',
            'card_design' => 'nullable|string',
            'card_prefix' => 'nullable|string',
            'card_number_length' => 'nullable|integer',
            'earning_based_on' => 'required|string',
            'points_for_every' => 'required|numeric',
            'points_to_be_earned' => 'required|numeric',
            'min_points_to_redeem' => 'required|numeric',
            'point_expiry_months' => 'required|integer',
            'status' => 'required|string',
            'valid_from' => 'nullable|date',
            'valid_to' => 'nullable|date',
            'allow_downgrade' => 'boolean',
            'allow_upgrade' => 'boolean',
        ]);

        $category = LoyaltyCardCategory::create($validated);

        ActivityLog::create([
            'user_id' => Auth::id(),
            'module' => 'Loyalty Management',
            'sub_module' => 'Category Master',
            'action' => 'Create',
            'description' => "Created Loyalty Category: {$category->category_name} ({$category->category_code})",
            'metadata' => $category->toArray()
        ]);

        return response()->json(['message' => 'Category created successfully', 'data' => $category]);
    }

    public function update(Request $request, $id)
    {
        $category = LoyaltyCardCategory::findOrFail($id);

        $validated = $request->validate([
            'category_code' => 'required|string|unique:loyalty_card_categories,category_code,' . $id,
            'category_name' => 'required|string',
            'description' => 'nullable|string',
            'category_type' => 'required|string',
            'card_color' => 'nullable|string',
            'card_design' => 'nullable|string',
            'card_prefix' => 'nullable|string',
            'card_number_length' => 'nullable|integer',
            'earning_based_on' => 'required|string',
            'points_for_every' => 'required|numeric',
            'points_to_be_earned' => 'required|numeric',
            'min_points_to_redeem' => 'required|numeric',
            'point_expiry_months' => 'required|integer',
            'status' => 'required|string',
            'valid_from' => 'nullable|date',
            'valid_to' => 'nullable|date',
            'allow_downgrade' => 'boolean',
            'allow_upgrade' => 'boolean',
        ]);

        $oldValues = $category->toArray();
        $category->update($validated);

        ActivityLog::create([
            'user_id' => Auth::id(),
            'module' => 'Loyalty Management',
            'sub_module' => 'Category Master',
            'action' => 'Update',
            'description' => "Updated Loyalty Category: {$category->category_name}",
            'metadata' => [
                'old' => $oldValues,
                'new' => $category->toArray()
            ]
        ]);

        return response()->json(['message' => 'Category updated successfully', 'data' => $category]);
    }

    public function destroy($id)
    {
        $category = LoyaltyCardCategory::findOrFail($id);
        $categoryName = $category->category_name;
        $category->delete();

        ActivityLog::create([
            'user_id' => Auth::id(),
            'module' => 'Loyalty Management',
            'sub_module' => 'Category Master',
            'action' => 'Delete',
            'description' => "Deleted Loyalty Category: {$categoryName}",
            'metadata' => ['id' => $id, 'name' => $categoryName]
        ]);

        return response()->json(['message' => 'Category deleted successfully']);
    }

    public function logs()
    {
        $logs = ActivityLog::with('user:id,name')
            ->where('module', 'Loyalty Management')
            ->where('sub_module', 'Category Master')
            ->latest()
            ->get();
            
        return response()->json(['data' => $logs]);
    }
}
