<?php

namespace App\Http\Controllers\API;

use App\Models\ActivityLog;
use App\Models\DigitalMetalMaster;
use App\Models\DigitalMetalMasterLog;
use App\Models\Membership;
use App\Models\User;
use App\Services\MembershipService;
use App\Services\OneClickEnrollmentService;
use App\Services\ReceiptService;
use App\Services\SchemeClosingService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MembershipController extends CrudController
{
    public function __construct(
        private readonly MembershipService $membershipService,
        private readonly OneClickEnrollmentService $oneClickEnrollmentService,
        private readonly SchemeClosingService $schemeClosingService
    )
    {
    }

    protected string $modelClass = Membership::class;

    protected array $relations = ['customer.kyc', 'user', 'scheme.maturityBenefits', 'installments', 'payments.installment', 'payments.receipt'];

    protected array $filterable = ['customer_id', 'user_id', 'scheme_id', 'status'];

    protected array $sortable = ['id', 'start_date', 'maturity_date', 'total_paid', 'created_at', 'updated_at'];

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->membershipService->paginate($request->all()));
    }

    public function show(int $id): JsonResponse
    {
        $membership = $this->freshModel($this->newQuery()->findOrFail($id))->toArray();
        //`dd($membership);
        $this->applySchemeSnapshot($membership);
        $this->attachInstallmentWeights($membership);

        return response()->json(['data' => $membership]);
    }

    /**
     * Same as CrudController::update(), except: when start_date actually
     * changes, the installment schedule (and maturity_date) is realigned to
     * the corrected opening date instead of being left stale.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $membership = Membership::query()->findOrFail($id);
        $originalStartDate = $membership->start_date?->toDateString();

        $validated = $request->validate($this->rules($membership));

        // Scheme Value changes (and the schedule reset that goes with them) are a "major
        // change" — they go only through regenerateSchedule(), which requires a reason,
        // logs to ActivityLog, and is role-gated. Silently accepting installment_value here
        // would let that destructive path bypass every one of those guardrails.
        unset($validated['installment_value']);

        $membership->update($this->mutateValidatedData($validated, $membership));

        if (array_key_exists('start_date', $validated) && $membership->start_date->toDateString() !== $originalStartDate) {
            $this->membershipService->realignScheduleToStartDate($membership);
        }

        return response()->json([
            'message' => 'Membership updated successfully.',
            'data' => $this->freshModel($membership),
        ]);
    }

    /**
     * The "major change" action: resets start_date, maturity_date, and every installment's
     * payable value together as one unit (MembershipService::regenerateInstallments()),
     * optionally recording an immediate payment against however many of the freshly
     * regenerated installments the payable amount covers — all in one transaction, gated to
     * super-admin/admin/cashier (routes/api.php), with a mandatory reason and a single
     * ActivityLog entry recording the before/after state.
     */
    public function regenerateSchedule(Request $request, int $id): JsonResponse
    {
        $membership = Membership::query()->findOrFail($id);

        $validated = $request->validate([
            'installment_value' => ['required', 'numeric', 'min:0.01'],
            'start_date' => ['required', 'date'],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
            'payable_amount' => ['nullable', 'numeric', 'min:0'],
            'gateway' => ['nullable', 'string', 'max:100'],
            'transaction_id' => ['nullable', 'string', 'max:255'],
            'payment_date' => ['nullable', 'date'],
            'payments' => ['nullable', 'array'],
            'payments.*.gateway' => ['required_with:payments', 'string', 'max:100'],
            'payments.*.amount' => ['required_with:payments', 'numeric', 'min:0'],
            'payments.*.transaction_id' => ['nullable', 'string', 'max:255'],
        ]);

        $before = [
            'start_date' => $membership->start_date?->toDateString(),
            'maturity_date' => $membership->maturity_date?->toDateString(),
            'installment_value' => $membership->scheme_snapshot['installment_value'] ?? null,
            'total_installments' => $membership->installments()->count(),
            'paid_installments' => $membership->installments()->where('paid', true)->count(),
        ];

        $paidInstallmentIds = DB::transaction(function () use ($membership, $validated) {
            $this->membershipService->regenerateInstallments(
                $membership,
                (float) $validated['installment_value'],
                (string) $validated['start_date']
            );

            if (empty($validated['payable_amount'])) {
                return [];
            }

            $count = max(1, (int) floor((float) $validated['payable_amount'] / (float) $validated['installment_value']));

            $pending = $membership->installments()
                ->where('paid', false)
                ->orderBy('installment_no')
                ->limit($count)
                ->get();

            if ($pending->isEmpty()) {
                abort(422, 'No pending installments available to pay after regenerating the schedule.');
            }

            if ($validated['payments'] ?? null) {
                $paymentPool = array_map(fn (array $p) => [
                    'gateway' => $p['gateway'] ?? 'cash',
                    'transaction_id' => $p['transaction_id'] ?? null,
                    'amount' => (float) $p['amount'],
                ], $validated['payments']);
            } else {
                $paymentPool = [[
                    'gateway' => $validated['gateway'] ?? 'cash',
                    'transaction_id' => $validated['transaction_id'] ?? null,
                    'amount' => (float) $validated['payable_amount'],
                ]];
            }

            app(ReceiptService::class)->createReceipt(
                $membership,
                $pending->toArray(),
                $paymentPool,
                (string) ($validated['payment_date'] ?? now()->toDateString())
            );

            return $pending->pluck('id')->all();
        });

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'module' => 'Membership',
            'sub_module' => 'Scheme Reset',
            'action' => 'Regenerate Schedule',
            'description' => sprintf(
                'Regenerated installment schedule for membership %s: installment value %s -> %s, start date %s -> %s. Reason: %s',
                $membership->membership_no,
                $before['installment_value'],
                $validated['installment_value'],
                $before['start_date'],
                $validated['start_date'],
                $validated['reason']
            ),
            'metadata' => [
                'membership_id' => $membership->id,
                'before' => $before,
                'after' => [
                    'installment_value' => $validated['installment_value'],
                    'start_date' => $validated['start_date'],
                ],
                'reason' => $validated['reason'],
                'paid_installment_ids' => $paidInstallmentIds,
            ],
        ]);

        return response()->json([
            'message' => 'Membership schedule regenerated successfully.',
            'data' => $this->freshModel($membership),
        ]);
    }

    /**
     * Overlay the terms locked in at enrollment (scheme_snapshot) onto the
     * `scheme` payload, so the detail page — and attachInstallmentWeights()
     * below, which reads scheme_type/item_group from this same array —
     * shows what this customer actually agreed to, not whatever the Scheme
     * template currently says after later edits.
     */
    private function applySchemeSnapshot(array &$membership): void
    {
        $snapshot = $membership['scheme_snapshot'] ?? null;

        if (! $snapshot || ! isset($membership['scheme']) || ! is_array($membership['scheme'])) {
            return;
        }

        $membership['scheme'] = array_merge($membership['scheme'], $snapshot);
    }

    /**
     * For Weight-type schemes, convert each installment's amount into gold weight (grams).
     * Paid installments lock in the rate as of paid_date (or due_date if paid on/before
     * the due date); unpaid installments show a live weight using today's rate.
     */
    private function attachInstallmentWeights(array &$membership): void
    {
        if (strtolower((string) ($membership['scheme']['scheme_type'] ?? '')) !== 'weight') {
            return;
        }

        $itemGroup = trim((string) ($membership['scheme']['item_group'] ?? ''));

        if ($itemGroup === '') {
            return;
        }

        $metalMaster = DigitalMetalMaster::query()
            ->get()
            ->first(fn (DigitalMetalMaster $m) => trim(trim((string) $m->purity) . ' ' . $m->metal_name) === $itemGroup
                || $m->metal_name === $itemGroup
                || $m->display_text === $itemGroup);

        if (! $metalMaster) {
            return;
        }

        $rateLogs = DigitalMetalMasterLog::query()
            ->where('digital_metal_master_id', $metalMaster->id)
            ->orderBy('created_at')
            ->get(['new_rate', 'created_at']);

        $resolveRate = function (Carbon $date) use ($rateLogs, $metalMaster): float {
            $rate = null;

            foreach ($rateLogs as $log) {
                if ($log->created_at->lte($date->copy()->endOfDay())) {
                    $rate = (float) $log->new_rate;
                } else {
                    break;
                }
            }

            return $rate ?? (float) ($metalMaster->rate_per ?? 0);
        };

        if (! isset($membership['installments']) || ! is_array($membership['installments'])) {
            return;
        }

        foreach ($membership['installments'] as &$installment) {
            $dueDate = Carbon::parse($installment['due_date']);
            $paidDate = ! empty($installment['paid_date']) ? Carbon::parse($installment['paid_date']) : null;
            $isPaid = (bool) ($installment['paid'] ?? false);

            if ($isPaid) {
                $targetDate = ($paidDate && $paidDate->gt($dueDate)) ? $paidDate : $dueDate;
            } else {
                $targetDate = Carbon::now();
            }

            $rate = $resolveRate($targetDate);
            $amount = (float) ($installment['amount'] ?? 0);

            if (isset($installment['manual_weight']) && $installment['manual_weight'] !== null) {
                $manualWeight = (float) $installment['manual_weight'];

                $installment['rate_per_gram'] = $manualWeight > 0 ? round($amount / $manualWeight, 2) : null;
                $installment['weight'] = $manualWeight;
            } else {
                $installment['rate_per_gram'] = $rate ?: null;
                $installment['weight'] = $rate > 0 ? round($amount / $rate, 4) : null;
            }
        }
        unset($installment);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());

        return response()->json([
            'message' => 'Membership created successfully.',
            'data' => $this->membershipService->create($this->mutateValidatedData($validated, null)),
        ], 201);
    }

    public function enroll(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer.name' => ['nullable', 'string', 'max:255'],
            'customer.mobile' => ['required', 'string', 'max:20'],
            'customer.email' => ['nullable', 'email', 'max:255'],
            'customer.status' => ['nullable', Rule::in(['active', 'inactive', 'blocked'])],
            'customer.portal_password' => ['nullable', 'string', 'min:6'],
            'scheme_id' => ['required', 'integer', 'exists:schemes,id'],
            'installment_value' => ['nullable', 'numeric', 'min:0'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'start_date' => ['required', 'date'],
            'payment.amount' => ['nullable', 'numeric', 'min:0'],
            'payment.gateway' => ['nullable', 'string', 'max:100'],
            'payment.transaction_id' => ['nullable', 'string', 'max:255'],
            'payment.payment_date' => ['nullable', 'date'],
            'payment.status' => ['nullable', Rule::in(['pending', 'success', 'failed', 'refunded'])],
            'payments' => ['nullable', 'array'],
            'payments.*.gateway' => ['required', 'string', 'max:100'],
            'payments.*.amount' => ['required', 'numeric', 'min:0'],
            'payments.*.transaction_id' => ['nullable', 'string', 'max:255'],
            'payments.*.payment_date' => ['nullable', 'date'],
            'membership_no' => ['nullable', 'string', 'max:100'],
        ]);

        return response()->json([
            'message' => 'Customer enrolled successfully.',
            'data' => $this->oneClickEnrollmentService->enroll($validated, $request->user()),
        ], 201);
    }

    public function closingPreview(int $id): JsonResponse
    {
        $membership = Membership::query()->findOrFail($id);

        return response()->json([
            'data' => $this->schemeClosingService->evaluate($membership),
        ]);
    }

    public function close(Request $request, int $id): JsonResponse
    {
        $membership = Membership::query()->findOrFail($id);
        $narration = $request->string('narration')->trim()->value() ?: null;
        $voucher = $this->schemeClosingService->closeMembership($membership, $narration);

        return response()->json([
            'message' => 'Scheme closed successfully.',
            'data' => $voucher->load('transactions'),
        ]);
    }

    public function forceClosingPreview(int $id): JsonResponse
    {
        $membership = Membership::query()->findOrFail($id);

        return response()->json([
            'data' => $this->schemeClosingService->evaluateForceClose($membership),
        ]);
    }

    public function forceClose(Request $request, int $id): JsonResponse
    {
        $membership = Membership::query()->findOrFail($id);
        $narration = $request->string('narration')->trim()->value() ?: null;
        $voucher = $this->schemeClosingService->forceCloseMembership($membership, $narration);

        return response()->json([
            'message' => 'Scheme force-closed successfully.',
            'data' => $voucher->load('transactions'),
        ]);
    }

    public function undoForceClose(int $id): JsonResponse
    {
        $membership = Membership::query()->findOrFail($id);
        $voucher = $this->schemeClosingService->undoForceClose($membership);

        return response()->json([
            'message' => 'Force closure undone successfully.',
            'data' => $voucher->load('transactions'),
        ]);
    }

    public function closingPreviewPdf(int $id)
    {
        $membership = Membership::query()->with('customer', 'scheme')->findOrFail($id);

        $evaluation = $this->schemeClosingService->evaluate($membership);
        $mode = 'close';

        if (! $evaluation['eligible']) {
            $evaluation = $this->schemeClosingService->evaluateForceClose($membership);
            $mode = 'force-close';
        }

        $pdf = Pdf::loadView('pdf.scheme-closure-preview', [
            'membership' => $membership,
            'mode' => $mode,
            'evaluation' => $evaluation,
            'generatedAt' => now()->format('d-m-Y H:i'),
        ]);

        return $pdf->download("scheme-closure-{$membership->membership_no}.pdf");
    }

    protected function rules(?Model $model = null): array
    {
        return [
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'scheme_id' => ['required', 'integer', 'exists:schemes,id'],
            'start_date' => ['required', 'date'],
            'maturity_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'total_paid' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', Rule::in(['active', 'paused', 'completed', 'matured', 'cancelled', 'closed', 'redeemed', 'settled'])],
            'installment_value' => ['nullable', 'numeric', 'min:0'],
            'membership_no' => ['nullable', 'string', 'max:100'],
            'card_no' => ['nullable', 'string', 'max:100'],
            'card_reference' => ['nullable', 'string', 'max:100'],
            'card_issued_at' => ['nullable', 'date'],
        ];
    }

    protected function mutateValidatedData(array $validated, ?Model $model): array
    {
        if (! isset($validated['user_id']) || empty($validated['user_id'])) {
            $validated['user_id'] = $this->resolveUserId((int) $validated['customer_id']);
        }

        return $validated;
    }

    private function resolveUserId(int $customerId): ?int
    {
        /** @var \App\Models\Customer|null $customer */
        $customer = \App\Models\Customer::query()->with('user')->find($customerId);

        if (! $customer) {
            return null;
        }

        if ($customer->user_id) {
            return $customer->user_id;
        }

        $query = User::query()->where(function ($builder) use ($customer) {
            if (! empty($customer->mobile)) {
                $builder->where('mobile', $customer->mobile);
            }

            if (! empty($customer->email)) {
                $builder->orWhere('email', $customer->email);
            }
        });

        return $query->value('id');
    }
}
