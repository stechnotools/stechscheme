<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\DigitalMetalSale;
use App\Models\DigitalMetalMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DigitalMetalSaleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $sales = DigitalMetalSale::with(['customer', 'digitalMetalMaster', 'creator', 'salesmanUser'])->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $sales
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|exists:customers,id',
            'digital_metal_master_id' => 'required|exists:digital_metal_masters,id',
            'voucher_no' => 'nullable|string',
            'voucher_date' => 'nullable|date',
            'weight' => 'required|numeric',
            'pcs' => 'nullable|integer',
            'rate_per_gm' => 'required|numeric',
            'other_charges' => 'nullable|numeric',
            'salesman' => 'nullable|string',
            'salesman_id' => 'nullable|exists:users,id',
            'markup_amount' => 'nullable|numeric',
            'total_amount' => 'required|numeric',
            'discount_amount' => 'nullable|numeric',
            'gst_amount' => 'nullable|numeric',
            'customer_mobile' => 'nullable|string',
            'customer_address' => 'nullable|string',
            'payment_mode' => 'nullable|string',
            'transaction_id' => 'nullable|string',
            'payment_details' => 'nullable|array',
            'status' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();
        
        // Auto-generate voucher number if missing
        if (empty($data['voucher_no'])) {
            $vSetup = \App\Models\VoucherSetup::where('transaction_type', 'Digital Sale')->first();
            if (!$vSetup) {
                $vSetup = \App\Models\VoucherSetup::where('transaction_type', 'Sale')->first();
            }
            if ($vSetup) {
                $data['voucher_no'] = $vSetup->prefix . $vSetup->start_no;
            }
        }

        $sale = DigitalMetalSale::create(array_merge(
            $data,
            ['created_by' => $request->user()?->id]
        ));

        // Auto-increment Voucher Number
        if ($sale->voucher_no) {
            $voucher = \App\Models\VoucherSetup::where('transaction_type', 'Digital Sale')->first();
            if (!$voucher) {
                $voucher = \App\Models\VoucherSetup::where('transaction_type', 'Sale')->first();
            }
            if ($voucher) {
                $voucher->increment('start_no');
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Digital Metal Sale Entry created successfully',
            'data' => $sale
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $sale = DigitalMetalSale::with(['customer', 'digitalMetalMaster', 'creator', 'salesmanUser'])->find($id);

        if (!$sale) {
            return response()->json([
                'success' => false,
                'message' => 'Sale record not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $sale
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $sale = DigitalMetalSale::find($id);

        if (!$sale) {
            return response()->json([
                'success' => false,
                'message' => 'Sale record not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'customer_id' => 'sometimes|required|exists:customers,id',
            'digital_metal_master_id' => 'sometimes|required|exists:digital_metal_masters,id',
            'voucher_no' => 'nullable|string',
            'voucher_date' => 'nullable|date',
            'weight' => 'sometimes|required|numeric',
            'pcs' => 'nullable|integer',
            'rate_per_gm' => 'sometimes|required|numeric',
            'other_charges' => 'nullable|numeric',
            'salesman' => 'nullable|string',
            'salesman_id' => 'nullable|exists:users,id',
            'markup_amount' => 'nullable|numeric',
            'total_amount' => 'sometimes|required|numeric',
            'discount_amount' => 'nullable|numeric',
            'gst_amount' => 'nullable|numeric',
            'customer_mobile' => 'nullable|string',
            'customer_address' => 'nullable|string',
            'payment_details' => 'nullable|array',
            'status' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $sale->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Digital Metal Sale Entry updated successfully',
            'data' => $sale
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $sale = DigitalMetalSale::find($id);

        if (!$sale) {
            return response()->json([
                'success' => false,
                'message' => 'Sale record not found'
            ], 404);
        }

        $sale->delete();

        return response()->json([
            'success' => true,
            'message' => 'Digital Metal Sale Entry deleted successfully'
        ]);
    }
}
