<?php

namespace App\Services;

use App\Models\CustomerKyc;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class KycService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = CustomerKyc::query()->with(['customer.company']);

        foreach (['customer_id', 'status', 'city', 'state'] as $field) {
            if (! empty($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($builder) use ($search) {
                $builder->where('aadhaar_number', 'like', "%{$search}%")
                    ->orWhere('pan_number', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhere('state', 'like', "%{$search}%");
            });
        }

        $perPage = max(1, min((int) ($filters['per_page'] ?? 15), 100));

        return $query->latest('id')->paginate($perPage);
    }

    public function create(array $validated): CustomerKyc
    {
        return CustomerKyc::updateOrCreate(
            ['customer_id' => $validated['customer_id']],
            $validated
        )->fresh(['customer.company']);
    }
}
