<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DigitalMetalPurchase;
use App\Models\DigitalMetalMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DigitalMetalPurchaseController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $purchases = DigitalMetalPurchase::with(['customer', 'digitalMetalMaster', 'creator'])->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $purchases
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

        $purchase = DigitalMetalPurchase::create(array_merge(
            $validator->validated(),
            ['created_by' => $request->user()?->id]
        ));

        return response()->json([
            'success' => true,
            'message' => 'Digital Metal Purchase Entry created successfully',
            'data' => $purchase
        ], 201);
    }
}
