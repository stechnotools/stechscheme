<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Installment;
use App\Models\Membership;
use App\Models\PendingPayment;
use App\Models\User;
use App\Services\CustomerPortalService;
use App\Services\PhonePeService;
use App\Services\ReceiptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CustomerPaymentController extends Controller
{
    public function __construct(
        private readonly CustomerPortalService $customerPortalService,
        private readonly PhonePeService $phonePeService,
        private readonly ReceiptService $receiptService,
    ) {
    }

    public function initiate(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        $validated = $request->validate([
            'membership_id' => ['required', 'integer'],
            'installment_ids' => ['required', 'array', 'min:1'],
            'installment_ids.*' => ['integer'],
        ]);

        $membership = Membership::where('customer_id', $customer->id)
            ->with('installments')
            ->findOrFail($validated['membership_id']);

        $installments = Installment::whereIn('id', $validated['installment_ids'])
            ->where('membership_id', $membership->id)
            ->where('paid', false)
            ->get();

        if ($installments->count() !== count($validated['installment_ids'])) {
            return response()->json(['message' => 'One or more installments are already paid or invalid.'], 422);
        }

        $amount = round((float) $installments->sum(fn ($i) => (float) $i->amount + (float) ($i->penalty ?? 0) - (float) $i->paid_amount), 2);
        $remainingPayable = $membership->getRemainingPayableAmount();

        if ($amount <= 0 || $amount > $remainingPayable + 0.001) {
            return response()->json(['message' => 'Invalid payment amount for the selected installments.'], 422);
        }

        $merchantOrderId = 'JS-' . now()->format('ymd') . '-' . Str::upper(Str::random(10));

        $pendingPayment = PendingPayment::create([
            'membership_id' => $membership->id,
            'customer_id' => $customer->id,
            'installment_ids' => $installments->pluck('id')->all(),
            'amount' => $amount,
            'merchant_order_id' => $merchantOrderId,
            'status' => 'initiated',
        ]);

        try {
            $order = $this->phonePeService->createOrder(
                $merchantOrderId,
                (int) round($amount * 100), // PhonePe amount is in paise
                config('services.phonepe.redirect_url') . '?merchant_order_id=' . $merchantOrderId,
            );
        } catch (\Throwable $e) {
            Log::error('PhonePe order creation failed', ['error' => $e->getMessage(), 'merchant_order_id' => $merchantOrderId]);
            $pendingPayment->update(['status' => 'failed']);

            return response()->json(['message' => 'Unable to start payment right now. Please try again shortly.'], 502);
        }

        $pendingPayment->update(['phonepe_order_id' => $order['order_id']]);

        return response()->json([
            'data' => [
                'merchant_order_id' => $merchantOrderId,
                'redirect_url' => $order['redirect_url'],
            ],
        ]);
    }

    public function status(Request $request, string $merchantOrderId): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $customer = $this->customerPortalService->resolveCustomerForUser($user);

        $pendingPayment = PendingPayment::where('customer_id', $customer->id)
            ->where('merchant_order_id', $merchantOrderId)
            ->firstOrFail();

        // If our own webhook hasn't landed yet, ask PhonePe directly rather than
        // leaving the customer staring at "pending" — the webhook is still the
        // only path that ever calls ReceiptService, this is read-only.
        if ($pendingPayment->status === 'initiated') {
            try {
                $remoteStatus = $this->phonePeService->checkOrderStatus($merchantOrderId);
                $pendingPayment->fresh();
            } catch (\Throwable $e) {
                Log::warning('PhonePe status check failed', ['error' => $e->getMessage(), 'merchant_order_id' => $merchantOrderId]);
            }
        }

        return response()->json([
            'data' => [
                'status' => $pendingPayment->status,
                'receipt_id' => $pendingPayment->receipt_id,
            ],
        ]);
    }

    /**
     * Public webhook — PhonePe calls this server-to-server. Signature is verified
     * BEFORE touching any data. On verified success, funnels through the same
     * ReceiptService::createReceipt() chokepoint PaymentController::store() uses —
     * never reimplement ledger/commission posting here.
     */
    public function webhook(Request $request): JsonResponse
    {
        if (! $this->phonePeService->verifyWebhookSignature($request->header('Authorization'))) {
            Log::warning('PhonePe webhook signature verification failed.');

            return response()->json(['message' => 'Invalid signature.'], 401);
        }

        $payload = $request->input('payload', $request->all());
        $merchantOrderId = $payload['merchantOrderId'] ?? $payload['payload']['merchantOrderId'] ?? null;
        $state = $payload['state'] ?? $payload['payload']['state'] ?? null;

        if (! $merchantOrderId) {
            return response()->json(['message' => 'Missing merchantOrderId.'], 422);
        }

        DB::transaction(function () use ($merchantOrderId, $state) {
            /** @var PendingPayment|null $pendingPayment */
            $pendingPayment = PendingPayment::where('merchant_order_id', $merchantOrderId)
                ->lockForUpdate()
                ->first();

            if (! $pendingPayment) {
                Log::warning('PhonePe webhook for unknown merchantOrderId', ['merchant_order_id' => $merchantOrderId]);
                return;
            }

            // Idempotency guard — a replayed/duplicate webhook must never double-post a receipt.
            if ($pendingPayment->status !== 'initiated') {
                return;
            }

            if ($state !== 'COMPLETED') {
                $pendingPayment->update(['status' => 'failed']);
                return;
            }

            $membership = Membership::findOrFail($pendingPayment->membership_id);

            $receipt = $this->receiptService->createReceipt(
                $membership,
                array_map(fn ($id) => ['id' => $id], $pendingPayment->installment_ids),
                [[
                    'gateway' => 'phonepe',
                    'amount' => (float) $pendingPayment->amount,
                    'transaction_id' => $pendingPayment->phonepe_order_id ?? $merchantOrderId,
                ]],
                now()->toDateString(),
                'success',
            );

            $pendingPayment->update(['status' => 'success', 'receipt_id' => $receipt->id]);
        });

        return response()->json(['message' => 'ok']);
    }
}
