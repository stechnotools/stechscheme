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

        $user = $this->resolvePortalUserForMobile($validated['mobile']);

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Mobile number or password is invalid.'], 401);
        }

        if (($user->status ?? 'active') !== 'active') {
            return response()->json(['message' => 'Customer portal access is blocked for this account.'], 403);
        }

        return $this->issuePortalSession($user);
    }

    public function loginOtpRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mobile' => ['required', 'string', 'max:20'],
        ]);

        $user = $this->resolvePortalUserForMobile($validated['mobile']);

        // Always return the same generic message — never reveal whether the mobile exists.
        if ($user) {
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

        $user = $this->resolvePortalUserForMobile($validated['mobile']);

        if (! $user) {
            return response()->json(['message' => 'No customer portal account found for this mobile number.'], 404);
        }

        if (($user->status ?? 'active') !== 'active') {
            return response()->json(['message' => 'Customer portal access is blocked for this account.'], 403);
        }

        return $this->issuePortalSession($user);
    }

    public function forgotPasswordRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mobile' => ['required', 'string', 'max:20'],
        ]);

        $user = $this->resolvePortalUserForMobile($validated['mobile']);

        // Always return the same generic message — never reveal whether the mobile exists.
        if ($user) {
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

        $user = $this->resolvePortalUserForMobile($validated['mobile']);

        if (! $user) {
            return response()->json(['message' => 'No customer portal account found for this mobile number.'], 404);
        }

        $user->update(['password' => $validated['password']]);
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Password updated successfully. Please login with your new password.',
        ]);
    }

    /**
     * Resolve the shared portal login (User) for a mobile number. A mobile
     * may match more than one Customer profile (household sharing a number,
     * or a merged customer's alternate_mobile) — they all share one User
     * account (see CustomerService::syncCustomerUser()), so any matching,
     * portal-enabled profile with a linked user resolves to the same login.
     */
    private function resolvePortalUserForMobile(string $mobile): ?User
    {
        $customer = Customer::query()
            ->forMobile($mobile)
            ->where('portal_enabled', true)
            ->whereNotNull('user_id')
            ->with('user')
            ->first();

        return $customer?->user;
    }

    /**
     * Issue a portal session token and resolve what to show next: a single
     * profile logs straight in as before; a household with several profiles
     * either auto-resumes its remembered default or asks the frontend to
     * show a profile picker (`requires_profile_selection`).
     */
    private function issuePortalSession(User $user): JsonResponse
    {
        $profiles = $this->customerPortalService->profilesForUser($user);

        if ($profiles->isEmpty()) {
            return response()->json(['message' => 'No active customer portal profile found for this account.'], 404);
        }

        // Token name (not abilities) is what EnsureCustomerPortalToken checks — see that middleware.
        $token = $user->createToken('customer-portal')->plainTextToken;

        $hasDefault = $user->default_customer_id && $profiles->contains('id', $user->default_customer_id);
        $requiresSelection = $profiles->count() > 1 && ! $hasDefault;

        return response()->json([
            'message' => 'Customer login successful.',
            'token' => $token,
            'data' => [
                'customer' => $requiresSelection ? null : $this->customerPortalService->resolveCustomerForUser($user),
                'user' => $user->only(['id', 'name', 'mobile', 'email', 'status']),
            ],
            'profiles' => $profiles->count() > 1 ? $profiles : [],
            'requires_profile_selection' => $requiresSelection,
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
