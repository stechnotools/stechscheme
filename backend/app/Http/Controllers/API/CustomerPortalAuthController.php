<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\User;
use App\Services\CustomerPortalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class CustomerPortalAuthController extends Controller
{
    public function __construct(private readonly CustomerPortalService $customerPortalService)
    {
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mobile' => ['required', 'string', 'max:20'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $customer = Customer::query()
            ->with('user.roles')
            ->where('mobile', $validated['mobile'])
            ->where('portal_enabled', true)
            ->first();

        if (! $customer || ! $customer->user || ! Hash::check($validated['password'], $customer->user->password)) {
            return response()->json(['message' => 'Mobile number or password is invalid.'], 401);
        }

        if (($customer->status ?? 'active') !== 'active' || ($customer->user->status ?? 'active') !== 'active') {
            return response()->json(['message' => 'Customer portal access is blocked for this account.'], 403);
        }

        $token = $customer->user->createToken('customer-portal')->plainTextToken;

        return response()->json([
            'message' => 'Customer login successful.',
            'token' => $token,
            'data' => [
                'customer' => $this->customerPortalService->resolveCustomerForUser($customer->user),
                'user' => $customer->user->only(['id', 'name', 'mobile', 'email', 'status']),
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $this->customerPortalService->resolveCustomerForUser($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}
