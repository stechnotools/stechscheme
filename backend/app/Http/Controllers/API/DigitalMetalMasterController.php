<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DigitalMetalMaster;
use App\Models\DigitalMetalMasterLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DigitalMetalMasterController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $masters = DigitalMetalMaster::with(['creator', 'lastLog'])->get();

        return response()->json([
            'success' => true,
            'data' => $masters
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'metal_name' => 'required|string|max:255',
            'purity' => 'nullable|string|max:255',
            'display_text' => 'nullable|string|max:255',
            'min_purchase_weight' => 'nullable|numeric',
            'min_purchase_amount' => 'nullable|numeric',
            'max_purchase_amount' => 'nullable|numeric',
            'rate_per' => 'nullable|numeric',
            'rate_per_unit' => 'nullable|string|max:255',
            'rate_per_display_text' => 'nullable|string|max:255',
            'rate_from' => 'nullable|string|max:255',
            'erp_metal_id' => 'nullable|string|max:255',
            'buy_markup_amount' => 'nullable|numeric',
            'sell_markup_amount' => 'nullable|numeric',
            'is_decimal_allow' => 'nullable|boolean',
            'status' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $master = DigitalMetalMaster::create(array_merge(
            $validator->validated(),
            ['created_by' => $request->user()?->id]
        ));

        return response()->json([
            'success' => true,
            'message' => 'Digital Metal Master created successfully',
            'data' => $master
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $master = DigitalMetalMaster::with('creator')->find($id);

        if (!$master) {
            return response()->json([
                'success' => false,
                'message' => 'Digital Metal Master not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $master
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $master = DigitalMetalMaster::find($id);

        if (!$master) {
            return response()->json([
                'success' => false,
                'message' => 'Digital Metal Master not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'metal_name' => 'sometimes|required|string|max:255',
            'purity' => 'nullable|string|max:255',
            'display_text' => 'nullable|string|max:255',
            'min_purchase_weight' => 'nullable|numeric',
            'min_purchase_amount' => 'nullable|numeric',
            'max_purchase_amount' => 'nullable|numeric',
            'rate_per' => 'nullable|numeric',
            'rate_per_unit' => 'nullable|string|max:255',
            'rate_per_display_text' => 'nullable|string|max:255',
            'rate_from' => 'nullable|string|max:255',
            'erp_metal_id' => 'nullable|string|max:255',
            'buy_markup_amount' => 'nullable|numeric',
            'sell_markup_amount' => 'nullable|numeric',
            'is_decimal_allow' => 'nullable|boolean',
            'status' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $oldData = $master->only(['rate_per', 'buy_markup_amount', 'sell_markup_amount']);
        $master->update($validator->validated());
        $newData = $master->only(['rate_per', 'buy_markup_amount', 'sell_markup_amount']);

        // Log if any sensitive fields changed
        if ($oldData != $newData) {
            DigitalMetalMasterLog::create([
                'digital_metal_master_id' => $master->id,
                'old_rate' => $oldData['rate_per'],
                'new_rate' => $newData['rate_per'],
                'old_buy_markup' => $oldData['buy_markup_amount'],
                'new_buy_markup' => $newData['buy_markup_amount'],
                'old_sell_markup' => $oldData['sell_markup_amount'],
                'new_sell_markup' => $newData['sell_markup_amount'],
                'updated_by' => $request->user()?->id
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Digital Metal Master updated successfully',
            'data' => $master
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $master = DigitalMetalMaster::find($id);

        if (!$master) {
            return response()->json([
                'success' => false,
                'message' => 'Digital Metal Master not found'
            ], 404);
        }

        $master->delete();

        return response()->json([
            'success' => true,
            'message' => 'Digital Metal Master deleted successfully'
        ]);
    }

    public function bulkRateUpdate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'rates' => 'required|array',
            'rates.*.id' => 'required|exists:digital_metal_masters,id',
            'rates.*.new_buy_rate' => 'required|numeric',
            'rates.*.new_sell_rate' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        foreach ($request->rates as $rateData) {
            $master = DigitalMetalMaster::with('lastLog')->find($rateData['id']);
            if ($master) {
                // Get current values from last log or master record
                $currentBaseRate = $master->lastLog ? $master->lastLog->new_rate : $master->rate_per;
                $currentBuyMarkup = $master->lastLog ? $master->lastLog->new_buy_markup : $master->buy_markup_amount;
                $currentSellMarkup = $master->lastLog ? $master->lastLog->new_sell_markup : $master->sell_markup_amount;

                // Calculate new base rate from Buy Rate (base = buy - markup)
                // We use the current buy markup to derive the new base rate
                $newRatePer = $rateData['new_buy_rate'] - $currentBuyMarkup;
                
                // Calculate new Sell Markup from Sell Rate (markup = sell - base)
                $newSellMarkup = $rateData['new_sell_rate'] - $newRatePer;

                if ($currentBaseRate != $newRatePer || $currentSellMarkup != $newSellMarkup) {
                    // $master->update([...]); // User requested not to update Metal Master field

                    DigitalMetalMasterLog::create([
                        'digital_metal_master_id' => $master->id,
                        'old_rate' => $currentBaseRate,
                        'new_rate' => $newRatePer,
                        'old_buy_markup' => $currentBuyMarkup,
                        'new_buy_markup' => $currentBuyMarkup, // Buy markup remains static in this calculation
                        'old_sell_markup' => $currentSellMarkup,
                        'new_sell_markup' => $newSellMarkup,
                        'updated_by' => $request->user()?->id
                    ]);
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Rates updated successfully'
        ]);
    }

    public function getAllLogs()
    {
        $logs = DigitalMetalMasterLog::with(['user', 'digitalMetalMaster'])
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $logs
        ]);
    }

    public function getLogs(string $id)
    {
        $logs = DigitalMetalMasterLog::with('user')
            ->where('digital_metal_master_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $logs
        ]);
    }
}
