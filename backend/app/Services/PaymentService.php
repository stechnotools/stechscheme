<?php

namespace App\Services;

use App\Models\Membership;
use App\Models\Payment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PaymentService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = Payment::query()->with(['membership.user', 'membership.scheme']);

        foreach (['membership_id', 'gateway', 'status'] as $field) {
            if (! empty($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }

        $perPage = max(1, min((int) ($filters['per_page'] ?? 15), 100));

        return $query->latest('id')->paginate($perPage);
    }

    public function syncPaymentState(Payment $payment): void
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

        /** @var Membership|null $membership */
        $membership = $payment->membership;

        if ($membership) {
            $membership->update([
                'total_paid' => (float) $membership->payments()->where('status', 'success')->sum('amount'),
            ]);
        }
    }
}
