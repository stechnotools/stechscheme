<?php

namespace App\Services;

use App\Models\Membership;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class MembershipService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = Membership::query()->with(['user.company', 'scheme.company', 'installments', 'payments']);

        foreach (['user_id', 'scheme_id', 'status'] as $field) {
            if (! empty($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }

        $perPage = max(1, min((int) ($filters['per_page'] ?? 15), 100));

        return $query->latest('id')->paginate($perPage);
    }
}
