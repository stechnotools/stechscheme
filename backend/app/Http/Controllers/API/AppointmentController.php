<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\User;
use App\Services\CustomerPortalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AppointmentController extends Controller
{
    public function __construct(private readonly CustomerPortalService $customerPortalService)
    {
    }

    public function storeForCustomer(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        $validated = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'requested_at' => ['required', 'date', 'after:now'],
            'purpose' => ['required', Rule::in(['redemption', 'purchase', 'general'])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $appointment = Appointment::create([
            'customer_id' => $customer->id,
            'branch_id' => $validated['branch_id'],
            'requested_at' => $validated['requested_at'],
            'purpose' => $validated['purpose'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Appointment request submitted. We will confirm shortly.',
            'data' => $appointment,
        ], 201);
    }

    public function indexForCustomer(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        $appointments = Appointment::with('branch:id,name,city,address')
            ->where('customer_id', $customer->id)
            ->orderByDesc('requested_at')
            ->get();

        return response()->json([
            'data' => $appointments,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $status = $request->input('status');

        $appointments = Appointment::with(['customer:id,name,mobile', 'branch:id,name,city'])
            ->when($status, fn ($query) => $query->where('status', $status))
            ->orderByDesc('requested_at')
            ->paginate(min((int) $request->input('per_page', 20), 100));

        return response()->json($appointments);
    }

    public function updateStatus(Request $request, Appointment $appointment): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['confirmed', 'cancelled', 'completed'])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $appointment->update($validated);

        return response()->json([
            'message' => 'Appointment updated.',
            'data' => $appointment,
        ]);
    }
}
