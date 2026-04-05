<?php

namespace App\Services;

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
}
