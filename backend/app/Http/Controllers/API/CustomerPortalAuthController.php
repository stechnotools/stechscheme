<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\User;
use App\Services\CustomerPortalService;
use App\Services\OtpService;
use App\Services\SmsService;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class CustomerPortalAuthController extends Controller
{
    public function __construct(
        private readonly CustomerPortalService $customerPortalService,
        private readonly OtpService $otpService,
        private readonly WhatsAppService $whatsAppService,
        private readonly SmsService $smsService,
    ) {
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

        // Token name (not abilities) is what EnsureCustomerPortalToken checks — see that middleware.
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

    public function loginOtpRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mobile' => ['required', 'string', 'max:20'],
        ]);

        $customer = Customer::query()
            ->where('mobile', $validated['mobile'])
            ->where('portal_enabled', true)
            ->first();

        // Always return the same generic message — never reveal whether the mobile exists.
        if ($customer) {
            $otp = $this->otpService->generate($validated['mobile']);

            $this->whatsAppService->sendOtp($validated['mobile'], $otp->otp);
            $this->smsService->sendMessage($validated['mobile'], "Your login OTP is {$otp->otp}. It expires in 10 minutes.");
        }

        return response()->json([
            'message' => 'If this mobile number is registered, an OTP has been sent to it.',
        ]);
    }

    public function loginOtpVerify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mobile' => ['required', 'string', 'max:20'],
            'otp' => ['required', 'string'],
        ]);

        if (! $this->otpService->verify($validated['mobile'], $validated['otp'])) {
            return response()->json(['message' => 'The OTP is invalid or has expired.'], 422);
        }

        $customer = Customer::query()
            ->with('user.roles')
            ->where('mobile', $validated['mobile'])
            ->where('portal_enabled', true)
            ->first();

        if (! $customer || ! $customer->user) {
            return response()->json(['message' => 'No customer portal account found for this mobile number.'], 404);
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

    public function forgotPasswordRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mobile' => ['required', 'string', 'max:20'],
        ]);

        $customer = Customer::query()
            ->where('mobile', $validated['mobile'])
            ->where('portal_enabled', true)
            ->first();

        // Always return the same generic message — never reveal whether the mobile exists.
        if ($customer) {
            $otp = $this->otpService->generate($validated['mobile']);

            $this->whatsAppService->sendOtp($validated['mobile'], $otp->otp);
            $this->smsService->sendMessage($validated['mobile'], "Your OTP is {$otp->otp}. It expires in 10 minutes.");
        }

        return response()->json([
            'message' => 'If this mobile number is registered, an OTP has been sent to it.',
        ]);
    }

    public function forgotPasswordVerify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mobile' => ['required', 'string', 'max:20'],
            'otp' => ['required', 'string'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        if (! $this->otpService->verify($validated['mobile'], $validated['otp'])) {
            return response()->json(['message' => 'The OTP is invalid or has expired.'], 422);
        }

        $customer = Customer::query()
            ->with('user')
            ->where('mobile', $validated['mobile'])
            ->where('portal_enabled', true)
            ->first();

        if (! $customer || ! $customer->user) {
            return response()->json(['message' => 'No customer portal account found for this mobile number.'], 404);
        }

        $customer->user->update(['password' => $validated['password']]);
        $customer->user->tokens()->delete();

        return response()->json([
            'message' => 'Password updated successfully. Please login with your new password.',
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
