<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\SalesmanCommission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesmanCommissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SalesmanCommission::with(['salesman', 'customer', 'scheme', 'membership', 'commissionType']);

        foreach (['salesman_id', 'status', 'event_type', 'rule_source', 'scheme_id'] as $field) {
            if ($request->filled($field)) {
                $query->where($field, $request->input($field));
            }
        }

        if ($request->filled('date_from')) {
            $query->whereDate('commission_date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('commission_date', '<=', $request->input('date_to'));
        }

        $perPage = max(1, min((int) $request->input('per_page', 15), 100));

        return response()->json(
            $query->orderBy('commission_date', 'desc')->paginate($perPage)
        );
    }

    public function approve(int $id): JsonResponse
    {
        $commission = SalesmanCommission::query()->findOrFail($id);

        if ($commission->status === 'paid') {
            return response()->json(['message' => 'A paid commission cannot be modified.'], 422);
        }

        $commission->update(['status' => 'approved']);

        return response()->json([
            'message' => 'Commission approved.',
            'data' => $commission,
        ]);
    }

    public function markPaid(int $id): JsonResponse
    {
        $commission = SalesmanCommission::query()->findOrFail($id);

        if ($commission->status === 'paid') {
            return response()->json([
                'message' => 'Commission already marked as paid.',
                'data' => $commission,
            ]);
        }

        $commission->update(['status' => 'paid', 'paid_at' => now()]);

        return response()->json([
            'message' => 'Commission marked as paid.',
            'data' => $commission,
        ]);
    }

    public function bulkMarkPaid(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
        ]);

        SalesmanCommission::query()
            ->whereIn('id', $validated['ids'])
            ->where('status', '!=', 'paid')
            ->update(['status' => 'paid', 'paid_at' => now()]);

        return response()->json(['message' => 'Selected commissions marked as paid.']);
    }
}
