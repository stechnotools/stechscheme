<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Kyc\StoreKycRequest;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\CustomerSupportMessage;
use App\Models\CustomerRelativeRequest;
use App\Models\DigitalMetalMaster;
use App\Models\GoldRateAlert;
use App\Models\LoyaltyLedger;
use App\Models\Product;
use App\Models\Scheme;
use App\Models\SchemeJoinRequest;
use App\Models\User;
use App\Services\CustomerPortalService;
use App\Services\KycService;
use App\Services\CustomerRelativeRequestService;
use App\Services\PushNotificationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerPortalController extends Controller
{
    /**
     * Whitelist (not blacklist) of Scheme fields safe for a customer-facing payload —
     * deliberately excludes chart-of-account references (late_fee_effect_account, etc.)
     * so newly added internal fields don't leak by default.
     */
    private const SCHEME_CUSTOMER_FIELDS = [
        'id',
        'name',
        'code',
        'description',
        'scheme_type',
        'item_group',
        'installment_value',
        'min_installment_value',
        'total_installments',
        'free_installments',
        'max_installments',
        'grace_days',
        'closing_penalty',
        'allow_overdue',
        'late_fee_type',
        'late_fee_value',
        'allow_bonus',
        'benefit_type',
        'benefit_mode',
        'bonus_no_of_installments',
        'lock_in_period_months',
        'redemption_window_days',
        'booking_purity',
        'allow_va_discount',
        'va_discount_percentage',
        'banner_image_path',
        'workflow_html',
        'remarks',
        'start_date',
        'termination_date',
    ];

    public function __construct(
        private readonly CustomerPortalService $customerPortalService,
        private readonly KycService $kycService,
        private readonly PushNotificationService $pushNotificationService,
        private readonly CustomerRelativeRequestService $customerRelativeRequestService,
    ) {
    }

    public function dashboard(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        return response()->json([
            'data' => $this->customerPortalService->dashboard($customer),
        ]);
    }

    public function profile(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $this->customerPortalService->resolveCustomerForUser($user),
        ]);
    }

    /**
     * List every Customer profile linked to the authenticated portal login —
     * used by the profile switcher for households sharing one mobile number.
     */
    public function profiles(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $this->customerPortalService->profilesForUser($user),
            'default_customer_id' => $user->default_customer_id,
        ]);
    }

    /**
     * Switch the active profile for this session and remember it as the
     * default for future logins. The chosen profile must belong to the
     * authenticated login — never trust a client-supplied customer_id blindly.
     */
    public function selectProfile(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'customer_id' => ['required', 'integer'],
        ]);

        $customer = Customer::query()
            ->where('id', $validated['customer_id'])
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->where('portal_enabled', true)
            ->first();

        if (! $customer) {
            return response()->json(['message' => 'That profile is not available on this account.'], 404);
        }

        $user->update(['default_customer_id' => $customer->id]);

        return response()->json([
            'message' => 'Profile switched successfully.',
            'data' => $this->customerPortalService->resolveCustomerForUser($user),
        ]);
    }

    public function memberships(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        return response()->json([
            'data' => $customer->memberships,
        ]);
    }

    public function showMembership(Request $request, int $membership): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        return response()->json([
            'data' => $this->customerPortalService->membership($customer, $membership),
        ]);
    }

    public function membershipStatement(Request $request, int $membership)
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);
        $membershipModel = $this->customerPortalService->membership($customer, $membership);

        $pdf = Pdf::loadView('pdf.membership-statement', [
            'customer' => $customer,
            'membership' => $membershipModel,
            'scheme' => $membershipModel->scheme,
            'installments' => $membershipModel->installments,
            'payments' => $membershipModel->payments,
            'generatedAt' => now()->format('d-m-Y H:i'),
        ]);

        return $pdf->download("statement-{$membershipModel->membership_no}.pdf");
    }

    public function installments(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);
        $membershipId = $request->integer('membership_id');

        $installments = $customer->memberships
            ->when($membershipId > 0, fn ($collection) => $collection->where('id', $membershipId))
            ->flatMap(fn ($membership) => $membership->installments)
            ->sortBy('due_date')
            ->values();

        return response()->json([
            'data' => $installments,
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);
        $membershipId = $request->integer('membership_id');

        $payments = $customer->memberships
            ->when($membershipId > 0, fn ($collection) => $collection->where('id', $membershipId))
            ->flatMap(fn ($membership) => $membership->payments)
            ->sortByDesc('payment_date')
            ->values();

        return response()->json([
            'data' => $payments,
        ]);
    }

    public function submitKyc(StoreKycRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        $validated = $request->validated();

        // Never trust customer_id/status/verified_at from the client — a customer
        // may only ever submit their own KYC, and every submission resets to pending.
        $validated['customer_id'] = $customer->id;
        $validated['status'] = 'pending';
        $validated['verified_at'] = null;

        return response()->json([
            'message' => 'KYC submitted successfully and is pending review.',
            'data' => $this->kycService->create($validated),
        ]);
    }

    public function schemes(): JsonResponse
    {
        $schemes = Scheme::query()
            ->where('is_closed', false)
            ->latest('id')
            ->get()
            ->map(fn (Scheme $scheme) => $scheme->only(self::SCHEME_CUSTOMER_FIELDS));

        return response()->json([
            'data' => $schemes,
        ]);
    }

    public function schemeDetail(int $scheme): JsonResponse
    {
        $schemeModel = Scheme::query()
            ->with('maturityBenefits')
            ->where('is_closed', false)
            ->findOrFail($scheme);

        $data = $schemeModel->only(self::SCHEME_CUSTOMER_FIELDS);
        $data['maturity_benefits'] = $schemeModel->maturityBenefits;

        return response()->json([
            'data' => $data,
        ]);
    }

    public function goldRate(): JsonResponse
    {
        $rates = DigitalMetalMaster::query()
            ->with('lastLog')
            ->where('status', 'Active')
            ->get()
            ->map(fn (DigitalMetalMaster $master) => $this->customerFacingRate($master));

        return response()->json([
            'data' => $rates,
        ]);
    }

    public function goldRateHistory(Request $request): JsonResponse
    {
        $masterId = $request->integer('master_id');

        $master = DigitalMetalMaster::query()
            ->with('lastLog')
            ->where('status', 'Active')
            ->when($masterId > 0, fn ($query) => $query->where('id', $masterId))
            ->firstOrFail();

        // old_sell_markup/new_sell_markup are captured per log row, so each
        // history point reflects the markup that was actually in effect then —
        // no need to retroactively apply today's markup to past rates.
        $history = $master->logs()
            ->orderBy('created_at')
            ->get()
            ->map(fn ($log) => [
                'date' => $log->created_at?->toDateString(),
                'rate' => (float) $log->new_rate + (float) $log->new_sell_markup,
            ]);

        return response()->json([
            'data' => [
                'master' => $this->customerFacingRate($master),
                'history' => $history,
            ],
        ]);
    }

    private function customerFacingRate(DigitalMetalMaster $master): array
    {
        // Bulk rate updates only append to digital_metal_master_logs and
        // deliberately leave rate_per/sell_markup_amount on the master
        // untouched, so the current effective rate must be resolved from
        // the latest log entry when one exists.
        $ratePer = $master->lastLog ? (float) $master->lastLog->new_rate : (float) $master->rate_per;
        $sellMarkup = $master->lastLog ? (float) $master->lastLog->new_sell_markup : (float) $master->sell_markup_amount;

        return [
            'id' => $master->id,
            'metal_name' => $master->metal_name,
            'purity' => $master->purity,
            'display_text' => $master->display_text,
            'rate_per_unit' => $master->rate_per_unit,
            'rate_per_display_text' => $master->rate_per_display_text,
            'effective_sell_rate' => $ratePer + $sellMarkup,
        ];
    }

    public function submitSupportMessage(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:150'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $supportMessage = CustomerSupportMessage::create([
            'customer_id' => $customer->id,
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'status' => 'open',
        ]);

        return response()->json([
            'message' => 'Your message has been sent. Our team will get back to you shortly.',
            'data' => $supportMessage,
        ], 201);
    }

    public function supportMessages(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        return response()->json([
            'data' => CustomerSupportMessage::where('customer_id', $customer->id)->latest()->get(),
        ]);
    }

    public function submitSchemeJoinRequest(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        $validated = $request->validate([
            'scheme_id' => ['required', 'integer', 'exists:schemes,id'],
            'terms_accepted' => ['required', 'accepted'],
        ]);

        $scheme = Scheme::where('is_closed', false)->findOrFail($validated['scheme_id']);

        $existing = SchemeJoinRequest::where('customer_id', $customer->id)
            ->where('scheme_id', $scheme->id)
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'You already have a pending request to join this scheme.',
                'data' => $existing,
            ], 409);
        }

        $joinRequest = SchemeJoinRequest::create([
            'customer_id' => $customer->id,
            'scheme_id' => $scheme->id,
            // Server-stamped, never trust a client-supplied acceptance timestamp.
            'terms_accepted_at' => now(),
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Your request to join this scheme has been submitted and is pending staff approval.',
            'data' => $joinRequest,
        ], 201);
    }

    public function schemeJoinRequests(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        $requests = SchemeJoinRequest::with('scheme')
            ->where('customer_id', $customer->id)
            ->latest()
            ->get()
            ->map(function (SchemeJoinRequest $joinRequest) {
                $data = $joinRequest->toArray();
                $data['scheme'] = $joinRequest->scheme?->only(self::SCHEME_CUSTOMER_FIELDS);

                return $data;
            });

        return response()->json([
            'data' => $requests,
        ]);
    }

    public function approveRelativeRequest(Request $request, CustomerRelativeRequest $relativeRequest): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        if ($relativeRequest->relative_customer_id !== $customer->id) {
            abort(404);
        }

        $updated = $this->customerRelativeRequestService->approve($relativeRequest, $user);

        $primaryUser = $updated->primaryCustomer?->user;
        if ($primaryUser) {
            $this->pushNotificationService->sendToUser(
                $primaryUser,
                'Relative request approved',
                sprintf('%s approved your relative account request.', $customer->name ?: 'The customer'),
                '/customer/panel'
            );
        }

        return response()->json([
            'message' => 'Relative account request approved.',
            'data' => $updated,
        ]);
    }

    public function rejectRelativeRequest(Request $request, CustomerRelativeRequest $relativeRequest): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        if ($relativeRequest->relative_customer_id !== $customer->id) {
            abort(404);
        }

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = $this->customerRelativeRequestService->reject($relativeRequest, $user, $validated['notes'] ?? null);

        return response()->json([
            'message' => 'Relative account request rejected.',
            'data' => $updated,
        ]);
    }

    public function pushSubscribe(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'endpoint' => ['required', 'string'],
            'keys.p256dh' => ['nullable', 'string'],
            'keys.auth' => ['nullable', 'string'],
            'contentEncoding' => ['nullable', 'string'],
        ]);

        $this->pushNotificationService->subscribe($user, $validated);

        return response()->json(['message' => 'Push notifications enabled.']);
    }

    public function pushUnsubscribe(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'endpoint' => ['required', 'string'],
        ]);

        $this->pushNotificationService->unsubscribe($user, $validated['endpoint']);

        return response()->json(['message' => 'Push notifications disabled.']);
    }

    public function pushStatus(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => ['subscribed' => $this->pushNotificationService->hasActiveSubscription($user)],
        ]);
    }

    public function wallet(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        return response()->json([
            'data' => [
                // The customer's own loyalty card number doubles as their shareable
                // referral code — it's already unique per customer, no new field needed.
                'referral_code' => $customer->loyalty_card_no,
                'points_balance' => (float) $customer->loyalty_points_balance,
                'lifetime_points' => (float) $customer->lifetime_points,
            ],
        ]);
    }

    public function walletTransactions(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        $transactions = LoyaltyLedger::where('customer_id', $customer->id)
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->paginate(min((int) $request->input('per_page', 20), 100));

        return response()->json($transactions);
    }

    public function catalog(Request $request): JsonResponse
    {
        $products = Product::query()
            ->orderByDesc('id')
            ->paginate(min((int) $request->input('per_page', 20), 50))
            ->through(fn (Product $product) => $product->only(['id', 'name', 'category', 'price', 'image']));

        return response()->json($products);
    }

    public function catalogShow(int $product): JsonResponse
    {
        $model = Product::query()->findOrFail($product);

        return response()->json([
            'data' => $model->only(['id', 'name', 'category', 'price', 'image']),
        ]);
    }

    public function branches(): JsonResponse
    {
        $branches = Branch::where('status', 'active')
            ->get()
            ->map(fn (Branch $branch) => $branch->only(['id', 'name', 'city', 'phone', 'address', 'latitude', 'longitude']));

        return response()->json([
            'data' => $branches,
        ]);
    }

    public function createGoldRateAlert(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        $validated = $request->validate([
            'digital_metal_master_id' => ['required', 'integer', 'exists:digital_metal_masters,id'],
            'target_rate' => ['required', 'numeric', 'min:0'],
            'direction' => ['required', 'in:above,below'],
        ]);

        $alert = GoldRateAlert::create([
            'customer_id' => $customer->id,
            'digital_metal_master_id' => $validated['digital_metal_master_id'],
            'target_rate' => $validated['target_rate'],
            'direction' => $validated['direction'],
            'triggered' => false,
        ]);

        return response()->json([
            'message' => 'You will be notified when the rate crosses your target.',
            'data' => $alert,
        ], 201);
    }

    public function goldRateAlerts(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        return response()->json([
            'data' => GoldRateAlert::where('customer_id', $customer->id)->latest()->get(),
        ]);
    }

    public function deleteGoldRateAlert(Request $request, GoldRateAlert $goldRateAlert): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        if ($goldRateAlert->customer_id !== $customer->id) {
            abort(404);
        }

        $goldRateAlert->delete();

        return response()->json(['message' => 'Alert removed.']);
    }
}
