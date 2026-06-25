<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\SchemeJoinRequest;
use App\Services\OneClickEnrollmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchemeJoinRequestController extends Controller
{
    public function __construct(private readonly OneClickEnrollmentService $oneClickEnrollmentService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $status = $request->input('status', 'pending');

        $requests = SchemeJoinRequest::with(['customer', 'scheme'])
            ->when($status, fn ($query) => $query->where('status', $status))
            ->latest()
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return response()->json($requests);
    }

    public function approve(Request $request, SchemeJoinRequest $schemeJoinRequest): JsonResponse
    {
        if ($schemeJoinRequest->status !== 'pending') {
            return response()->json(['message' => 'This request has already been reviewed.'], 409);
        }

        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $customer = $schemeJoinRequest->customer;

        $enrollment = $this->oneClickEnrollmentService->enroll([
            'customer' => [
                'name' => $customer->name,
                'mobile' => $customer->mobile,
                'email' => $customer->email,
                'status' => $customer->status,
                // OneClickEnrollmentService::update() overwrites loyalty_card_no with
                // whatever is passed here (even null) — must round-trip the existing
                // value explicitly or an existing customer's card number gets wiped.
                'loyalty_card_no' => $customer->loyalty_card_no,
            ],
            'scheme_id' => $schemeJoinRequest->scheme_id,
            'start_date' => $validated['start_date'] ?? now()->toDateString(),
        ], $request->user());

        $schemeJoinRequest->update([
            'status' => 'approved',
            'notes' => $validated['notes'] ?? null,
            'converted_membership_id' => $enrollment['membership']->id,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Join request approved and membership created.',
            'data' => $schemeJoinRequest->fresh(['customer', 'scheme', 'convertedMembership']),
        ]);
    }

    public function reject(Request $request, SchemeJoinRequest $schemeJoinRequest): JsonResponse
    {
        if ($schemeJoinRequest->status !== 'pending') {
            return response()->json(['message' => 'This request has already been reviewed.'], 409);
        }

        $validated = $request->validate([
            'notes' => ['nullable', 'string'],
        ]);

        $schemeJoinRequest->update([
            'status' => 'rejected',
            'notes' => $validated['notes'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Join request rejected.',
            'data' => $schemeJoinRequest,
        ]);
    }
}
