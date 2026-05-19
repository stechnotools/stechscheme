<?php

namespace App\Http\Controllers;

use App\Models\MetalRedeemOption;
use App\Models\DigitalMetalMaster;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class MetalRedeemOptionController extends Controller
{
    public function index()
    {
        $options = MetalRedeemOption::with(['digitalMetalMaster', 'creator:id,name', 'updator:id,name'])
            ->latest()
            ->get();
            
        return response()->json(['success' => true, 'data' => $options]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'digital_metal_master_id' => 'required|exists:digital_metal_masters,id',
            'option_name' => 'required|string|max:255',
            'display_text' => 'nullable|string|max:255',
            'option_value' => 'required|numeric',
            'status' => 'required|in:Active,Inactive',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $option = MetalRedeemOption::create(array_merge(
            $validator->validated(),
            ['created_by' => Auth::id()]
        ));

        ActivityLog::create([
            'user_id' => Auth::id(),
            'module' => 'Digital Metal',
            'sub_module' => 'Redeem Options',
            'action' => 'Create',
            'description' => "Created redeem option '{$option->option_name}' for metal ID {$option->digital_metal_master_id}",
            'metadata' => $option->toArray()
        ]);

        return response()->json(['success' => true, 'message' => 'Redeem option created successfully', 'data' => $option]);
    }

    public function update(Request $request, $id)
    {
        $option = MetalRedeemOption::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'digital_metal_master_id' => 'required|exists:digital_metal_masters,id',
            'option_name' => 'required|string|max:255',
            'display_text' => 'nullable|string|max:255',
            'option_value' => 'required|numeric',
            'status' => 'required|in:Active,Inactive',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $oldData = $option->toArray();
        $option->update(array_merge(
            $validator->validated(),
            ['updated_by' => Auth::id()]
        ));

        ActivityLog::create([
            'user_id' => Auth::id(),
            'module' => 'Digital Metal',
            'sub_module' => 'Redeem Options',
            'action' => 'Update',
            'description' => "Updated redeem option '{$option->option_name}'",
            'metadata' => [
                'old' => $oldData,
                'new' => $option->toArray()
            ]
        ]);

        return response()->json(['success' => true, 'message' => 'Redeem option updated successfully', 'data' => $option]);
    }

    public function destroy($id)
    {
        $option = MetalRedeemOption::findOrFail($id);
        $optionName = $option->option_name;
        $option->delete();

        ActivityLog::create([
            'user_id' => Auth::id(),
            'module' => 'Digital Metal',
            'sub_module' => 'Redeem Options',
            'action' => 'Delete',
            'description' => "Deleted redeem option '{$optionName}'",
        ]);

        return response()->json(['success' => true, 'message' => 'Redeem option deleted successfully']);
    }
}
