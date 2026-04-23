<?php

namespace App\Http\Controllers\API;

use App\Models\Payment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PaymentController extends CrudController
{
    protected string $modelClass = Payment::class;

    protected array $relations = ['membership.customer', 'membership.scheme', 'installment'];

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

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());

        /** @var Payment $payment */
        $payment = DB::transaction(function () use ($validated) {
            $payment = Payment::query()->create($this->mutateValidatedData($validated, null));
            $this->applyPaymentEffects($payment);

            return $payment;
        });

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
            $membership = \App\Models\Membership::query()->findOrFail($validated['membership_id']);
            $nextInstallment = $membership->installments()->where('paid', false)->orderBy('installment_no')->first();

            if ($nextInstallment) {
                $validated['installment_id'] = $nextInstallment->id;
            }
        }

        return $validated;
    }

    public function storeBulk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'membership_id' => ['required', 'integer', 'exists:memberships,id'],
            'installment_ids' => ['required', 'array', 'min:1'],
            'installment_ids.*' => ['integer', 'exists:installments,id'],
            'gateway' => ['nullable', 'string', 'max:100'],
            'transaction_id' => ['nullable', 'string', 'max:255'],
            'payment_date' => ['required', 'date'],
            'status' => ['required', Rule::in(['pending', 'success', 'failed', 'refunded'])],
        ]);

        $payments = DB::transaction(function () use ($validated) {
            $installments = \App\Models\Installment::query()
                ->whereIn('id', $validated['installment_ids'])
                ->where('membership_id', $validated['membership_id'])
                ->where('paid', false)
                ->orderBy('installment_no')
                ->get();

            if ($installments->count() !== count($validated['installment_ids'])) {
                abort(422, 'One or more installments are already paid or do not belong to this membership.');
            }

            return $installments->map(function (\App\Models\Installment $installment) use ($validated) {
                $payment = Payment::query()->create([
                    'membership_id' => $validated['membership_id'],
                    'installment_id' => $installment->id,
                    'amount' => (float) $installment->amount + (float) ($installment->penalty ?? 0),
                    'gateway' => $validated['gateway'] ?? null,
                    'transaction_id' => $validated['transaction_id'] ?? null,
                    'payment_date' => $validated['payment_date'],
                    'status' => $validated['status'],
                ]);

                if ($validated['status'] === 'success') {
                    $installment->update([
                        'paid' => true,
                        'paid_date' => $validated['payment_date'],
                    ]);
                }

                return $payment;
            });
        });

        $membership = \App\Models\Membership::query()->find($validated['membership_id']);
        if ($membership) {
            $membership->update([
                'total_paid' => (float) $membership->payments()->where('status', 'success')->sum('amount'),
            ]);
        }

        return response()->json([
            'message' => count($payments) . ' installment payments created successfully.',
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
