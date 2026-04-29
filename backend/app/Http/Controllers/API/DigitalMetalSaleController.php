<?php

namespace App\Http\Controllers\Api;

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
        $sales = DigitalMetalSale::with(['customer', 'digitalMetalMaster', 'creator'])->orderBy('created_at', 'desc')->get();

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
            'weight' => 'required|numeric',
            'rate_per_gm' => 'required|numeric',
            'markup_amount' => 'nullable|numeric',
            'total_amount' => 'required|numeric',
            'payment_mode' => 'nullable|string',
            'transaction_id' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $sale = DigitalMetalSale::create(array_merge(
            $validator->validated(),
            ['created_by' => $request->user()?->id]
        ));

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
        $sale = DigitalMetalSale::with(['customer', 'digitalMetalMaster', 'creator'])->find($id);

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
}
