<?php

namespace App\Http\Controllers;

use App\Models\MetalBuyingOption;
use App\Models\DigitalMetalMaster;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class MetalBuyingOptionController extends Controller
{
    public function index()
    {
        $options = MetalBuyingOption::with(['digitalMetalMaster', 'creator:id,name', 'updator:id,name'])
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

        $option = MetalBuyingOption::create(array_merge(
            $validator->validated(),
            ['created_by' => Auth::id()]
        ));

        ActivityLog::create([
            'user_id' => Auth::id(),
            'module' => 'Digital Metal',
            'sub_module' => 'Buying Options',
            'action' => 'Create',
            'description' => "Created buying option '{$option->option_name}' for metal ID {$option->digital_metal_master_id}",
            'metadata' => $option->toArray()
        ]);

        return response()->json(['success' => true, 'message' => 'Buying option created successfully', 'data' => $option]);
    }

    public function update(Request $request, $id)
    {
        $option = MetalBuyingOption::findOrFail($id);
        
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
            'sub_module' => 'Buying Options',
            'action' => 'Update',
            'description' => "Updated buying option '{$option->option_name}'",
            'metadata' => [
                'old' => $oldData,
                'new' => $option->toArray()
            ]
        ]);

        return response()->json(['success' => true, 'message' => 'Buying option updated successfully', 'data' => $option]);
    }

    public function destroy($id)
    {
        $option = MetalBuyingOption::findOrFail($id);
        $optionName = $option->option_name;
        $option->delete();

        ActivityLog::create([
            'user_id' => Auth::id(),
            'module' => 'Digital Metal',
            'sub_module' => 'Buying Options',
            'action' => 'Delete',
            'description' => "Deleted buying option '{$optionName}'",
        ]);

        return response()->json(['success' => true, 'message' => 'Buying option deleted successfully']);
    }
}
