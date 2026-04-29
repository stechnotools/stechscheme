<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\MetalMaster;
use App\Models\MetalRateLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MetalMasterController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $metalMasters = MetalMaster::with(['creator', 'lastRateLog.user'])->orderBy('sort_order', 'asc')->get();
        return response()->json([
            'success' => true,
            'data' => $metalMasters
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'metal_name' => 'required|string|max:255',
            'rate_per' => 'nullable|numeric',
            'rate_per_unit' => 'nullable|string|max:50',
            'rate_per_display_text' => 'nullable|string|max:255',
            'rate_from' => 'required|string|max:50',
            'erp_metal_id' => 'nullable|string|max:255',
            'group_name' => 'nullable|string|max:255',
            'display_text' => 'nullable|string|max:255',
            'show_in_dashboard' => 'required|boolean',
            'sort_order' => 'nullable|integer',
            'is_decimal_allow' => 'required|boolean',
            'booking_amount_percent' => 'nullable|numeric',
            'status' => 'nullable|string|max:50',
        ]);

        return DB::transaction(function () use ($request, $validatedData) {
            if ($request->user()) {
                $validatedData['created_by'] = $request->user()->id;
            }

            $metalMaster = MetalMaster::create($validatedData);

            // Log initial rate
            if ($metalMaster->rate_per) {
                MetalRateLog::create([
                    'metal_master_id' => $metalMaster->id,
                    'old_rate' => null,
                    'new_rate' => $metalMaster->rate_per,
                    'updated_by' => $request->user()?->id,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Metal Master created successfully',
                'data' => $metalMaster->load('creator')
            ], 201);
        });
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $metalMaster = MetalMaster::findOrFail($id);
        return response()->json([
            'success' => true,
            'data' => $metalMaster
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $metalMaster = MetalMaster::findOrFail($id);

        $validatedData = $request->validate([
            'metal_name' => 'sometimes|required|string|max:255',
            'rate_per' => 'sometimes|nullable|numeric',
            'rate_per_unit' => 'sometimes|nullable|string|max:50',
            'rate_per_display_text' => 'sometimes|nullable|string|max:255',
            'rate_from' => 'sometimes|required|string|max:50',
            'erp_metal_id' => 'sometimes|nullable|string|max:255',
            'group_name' => 'sometimes|nullable|string|max:255',
            'display_text' => 'sometimes|nullable|string|max:255',
            'show_in_dashboard' => 'sometimes|required|boolean',
            'sort_order' => 'nullable|integer',
            'is_decimal_allow' => 'sometimes|required|boolean',
            'booking_amount_percent' => 'nullable|numeric',
            'status' => 'nullable|string|max:50',
        ]);

        return DB::transaction(function () use ($request, $metalMaster, $validatedData) {
            $oldRate = $metalMaster->rate_per;
            $metalMaster->update($validatedData);

            // Log if rate has changed
            if (isset($validatedData['rate_per']) && $oldRate != $validatedData['rate_per']) {
                MetalRateLog::create([
                    'metal_master_id' => $metalMaster->id,
                    'old_rate' => $oldRate,
                    'new_rate' => $validatedData['rate_per'],
                    'updated_by' => $request->user()?->id,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Metal Master updated successfully',
                'data' => $metalMaster->load(['creator', 'lastRateLog.user'])
            ]);
        });
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $metalMaster = MetalMaster::findOrFail($id);
        $metalMaster->delete();

        return response()->json([
            'success' => true,
            'message' => 'Metal Master deleted successfully'
        ]);
    }

    /**
     * Bulk update rates for multiple metal masters.
     */
    public function bulkRateUpdate(Request $request)
    {
        $validatedData = $request->validate([
            'rates' => 'required|array',
            'rates.*.id' => 'required|exists:metal_masters,id',
            'rates.*.rate_per' => 'nullable|numeric',
        ]);

        return DB::transaction(function () use ($request, $validatedData) {
            $updatedIds = [];
            foreach ($validatedData['rates'] as $item) {
                $metalMaster = MetalMaster::find($item['id']);
                $currentRate = $metalMaster->lastRateLog ? $metalMaster->lastRateLog->new_rate : $metalMaster->rate_per;
                $newRate = $item['rate_per'];

                if ($currentRate != $newRate) {
                    // $metalMaster->update(['rate_per' => $newRate]); // User requested not to update Metal Master field

                    MetalRateLog::create([
                        'metal_master_id' => $metalMaster->id,
                        'old_rate' => $currentRate,
                        'new_rate' => $newRate,
                        'updated_by' => $request->user()?->id,
                    ]);
                    $updatedIds[] = $metalMaster->id;
                }
            }

            return response()->json([
                'success' => true,
                'message' => count($updatedIds) . ' rates updated successfully',
                'updated_ids' => $updatedIds
            ]);
        });
    }

    /**
     * Get rate logs for a specific metal master.
     */
    public function getLogs($id)
    {
        $logs = MetalRateLog::with('user')
            ->where('metal_master_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $logs
        ]);
    }

    public function getAllLogs()
    {
        $logs = MetalRateLog::with(['user', 'metalMaster'])
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $logs
        ]);
    }
}
