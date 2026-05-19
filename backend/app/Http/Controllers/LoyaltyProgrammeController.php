<?php

namespace App\Http\Controllers;

use App\Models\LoyaltyProgramme;
use Illuminate\Http\Request;

class LoyaltyProgrammeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(LoyaltyProgramme::all());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'points_per_amount' => 'nullable|numeric',
            'min_redemption_points' => 'nullable|integer',
            'status' => 'nullable|in:active,inactive',
        ]);

        $loyaltyProgramme = LoyaltyProgramme::create($validated);

        return response()->json($loyaltyProgramme, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(LoyaltyProgramme $loyaltyProgramme)
    {
        return response()->json($loyaltyProgramme);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, LoyaltyProgramme $loyaltyProgramme)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'points_per_amount' => 'nullable|numeric',
            'min_redemption_points' => 'nullable|integer',
            'status' => 'nullable|in:active,inactive',
        ]);

        $loyaltyProgramme->update($validated);

        return response()->json($loyaltyProgramme);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(LoyaltyProgramme $loyaltyProgramme)
    {
        $loyaltyProgramme->delete();

        return response()->json(null, 204);
    }
}
