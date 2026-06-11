<?php

namespace App\Http\Controllers\API;

use App\Models\Membership;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PaymentController extends CrudController
{
    protected string $modelClass = Payment::class;

    protected array $relations = ['membership.customer', 'membership.scheme', 'installment', 'receipt.customer', 'receipt.voucher', 'receipt.payments', 'receipt.details.installment'];

    protected array $filterable = ['membership_id', 'gateway', 'status'];

    protected array $sortable = ['id', 'amount', 'payment_date', 'created_at', 'updated_at'];

    public function index(Request $request): JsonResponse
    {
        $query = $this->newQuery();

        foreach ($this->filterable as $field) {
            if ($request->filled($field)) {
                $query->where($field, $request->input($field));
            }
        }

        if ($request->filled('customer_id')) {
            $query->whereHas('membership', fn ($builder) => $builder->where('customer_id', (int) $request->input('customer_id')));
        }

        if ($request->filled('customer_name')) {
            $query->whereHas('membership.customer', function ($builder) use ($request) {
                $builder->where('name', 'like', '%' . (string) $request->input('customer_name') . '%');
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('payment_date', '>=', (string) $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('payment_date', '<=', (string) $request->input('date_to'));
        }

        $sortBy = $request->input('sort_by', 'payment_date');
        $sortDirection = strtolower((string) $request->input('sort_direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        if (in_array($sortBy, $this->sortable, true)) {
            $query->orderBy($sortBy, $sortDirection);
        }

        $perPage = max(1, min((int) $request->input('per_page', $this->defaultPerPage), 100));

        return response()->json($query->paginate($perPage));
    }

    public function show(int|string $id): JsonResponse
    {
        if (request()->boolean('by_receipt')) {
            $payments = Payment::query()->with($this->relations)->where('receipt_id', (int) $id)->get();

            return response()->json([
                'data' => $payments,
            ]);
        }

        if (is_string($id) && str_contains($id, ',')) {
            $ids = explode(',', $id);
            $payments = Payment::query()->with($this->relations)->whereIn('id', $ids)->get();

            return response()->json([
                'data' => $payments,
            ]);
        }

        return parent::show((int) $id);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());
        $mutated = $this->mutateValidatedData($validated, null);

        $membership = Membership::query()->with('installments')->findOrFail($mutated['membership_id']);
        $installmentId = $mutated['installment_id'];
        $paymentAmount = (float) $mutated['amount'];
        $remainingPayable = $this->getRemainingPayableAmount($membership);

        if ($paymentAmount > $remainingPayable + 0.001) {
            abort(
                422,
                'Payment amount exceeds the remaining payable amount. Remaining balance is ' . number_format($remainingPayable, 2, '.', '') . '.'
            );
        }

        $paymentPool = [
            [
                'gateway' => $mutated['gateway'] ?? 'cash',
                'amount' => $paymentAmount,
                'transaction_id' => $mutated['transaction_id'] ?? null,
            ]
        ];

        $receipt = DB::transaction(function () use ($membership, $installmentId, $paymentPool, $mutated) {
            return app(\App\Services\ReceiptService::class)->createReceipt(
                $membership,
                [['id' => $installmentId]],
                $paymentPool,
                $mutated['payment_date'],
                $mutated['status']
            );
        });

        $payment = $receipt->legacyPayments()->first();

        return response()->json([
            'message' => 'Payment created successfully.',
            'data' => $this->freshModel($payment),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        /** @var Payment $payment */
        $payment = Payment::query()->findOrFail($id);
        $validated = $request->validate($this->rules($payment));

        DB::transaction(function () use ($payment, $validated) {
            $payment->update($this->mutateValidatedData($validated, $payment));
            $this->applyPaymentEffects($payment);
        });

        return response()->json([
            'message' => 'Payment updated successfully.',
            'data' => $this->freshModel($payment),
        ]);
    }

    protected function rules(?Model $model = null): array
    {
        return [
            'membership_id' => ['required', 'integer', 'exists:memberships,id'],
            'installment_id' => ['nullable', 'integer', 'exists:installments,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'gateway' => ['nullable', 'string', 'max:100'],
            'transaction_id' => ['nullable', 'string', 'max:255'],
            'payment_date' => ['required', 'date'],
            'status' => ['required', Rule::in(['pending', 'success', 'failed', 'refunded'])],
        ];
    }

    protected function mutateValidatedData(array $validated, ?Model $model): array
    {
        if (! array_key_exists('installment_id', $validated) || empty($validated['installment_id'])) {
            $membership = Membership::query()->findOrFail($validated['membership_id']);
            $nextInstallment = $membership->installments()->where('paid', false)->orderBy('installment_no')->first();

            if ($nextInstallment) {
                $validated['installment_id'] = $nextInstallment->id;
            }
        }

        return $validated;
    }

    private function getRemainingPayableAmount(Membership $membership): float
    {
        $installments = $membership->relationLoaded('installments')
            ? $membership->installments
            : $membership->installments()->get(['amount', 'penalty', 'paid_amount']);

        return round((float) $installments->sum(function ($installment) {
            return max(
                0,
                (float) $installment->amount + (float) ($installment->penalty ?? 0) - (float) ($installment->paid_amount ?? 0)
            );
        }), 2);
    }

    public function storeBulk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'membership_id' => ['required', 'integer', 'exists:memberships,id'],
            'installment_ids' => ['required', 'array', 'min:1'],
            'installment_ids.*' => ['integer', 'exists:installments,id'],
            'gateway' => ['nullable', 'string', 'max:100'],
            'transaction_id' => ['nullable', 'string', 'max:255'],
            'payments' => ['nullable', 'array'],
            'payments.*.gateway' => ['required', 'string', 'max:100'],
            'payments.*.amount' => ['required', 'numeric', 'min:0'],
            'payments.*.transaction_id' => ['nullable', 'string', 'max:255'],
            'payment_date' => ['required', 'date'],
            'status' => ['required', Rule::in(['pending', 'success', 'failed', 'refunded'])],
        ]);

        $membership = \App\Models\Membership::findOrFail($validated['membership_id']);

        $receipt = DB::transaction(function () use ($validated, $membership) {
            $installments = \App\Models\Installment::query()
                ->whereIn('id', $validated['installment_ids'])
                ->where('membership_id', $validated['membership_id'])
                ->where('paid', false)
                ->orderBy('installment_no')
                ->get();

            if ($installments->count() !== count($validated['installment_ids'])) {
                abort(422, 'One or more installments are already paid or do not belong to this membership.');
            }

            // Prepare payment pool
            $paymentPool = [];
            if ($validated['payments'] ?? null) {
                foreach ($validated['payments'] as $p) {
                    $paymentPool[] = [
                        'gateway' => $p['gateway'] ?? 'cash',
                        'transaction_id' => $p['transaction_id'] ?? null,
                        'amount' => (float) $p['amount'],
                    ];
                }
            } else {
                $totalDue = $installments->sum(fn ($i) => (float) $i->amount + (float) ($i->penalty ?? 0) - (float) $i->paid_amount);
                $paymentPool[] = [
                    'gateway' => $validated['gateway'] ?? 'cash',
                    'transaction_id' => $validated['transaction_id'] ?? null,
                    'amount' => $totalDue,
                ];
            }

            return app(\App\Services\ReceiptService::class)->createReceipt(
                $membership,
                $installments->toArray(),
                $paymentPool,
                $validated['payment_date'],
                $validated['status']
            );
        });

        $payments = $receipt->legacyPayments()->with($this->relations)->get();

        return response()->json([
            'message' => $payments->count() . ' installment payments created successfully.',
            'data' => $payments,
        ], 201);
    }

    private function applyPaymentEffects(Payment $payment): void
    {
        $payment->loadMissing('membership', 'installment');

        if ($payment->status === 'success' && $payment->installment) {
            $payment->installment->update([
                'paid' => true,
                'paid_date' => $payment->payment_date,
            ]);
        }

        if ($payment->status !== 'success' && $payment->installment && $payment->installment->payments()->where('status', 'success')->count() === 0) {
            $payment->installment->update([
                'paid' => false,
                'paid_date' => null,
            ]);
        }

        if ($payment->membership) {
            $payment->membership->update([
                'total_paid' => (float) $payment->membership->payments()->where('status', 'success')->sum('amount'),
            ]);
        }
    }
}
