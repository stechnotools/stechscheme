<?php

namespace App\Services;

use App\Models\Customer;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CustomerService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = Customer::query()->with(['company', 'kyc']);

        foreach (['company_id', 'status'] as $field) {
            if (! empty($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $sortBy = in_array(($filters['sort_by'] ?? 'id'), ['id', 'name', 'mobile', 'created_at', 'updated_at'], true)
            ? $filters['sort_by']
            : 'id';
        $sortDirection = strtolower((string) ($filters['sort_direction'] ?? 'desc')) === 'asc' ? 'asc' : 'desc';
        $perPage = max(1, min((int) ($filters['per_page'] ?? 15), 100));

        return $query->orderBy($sortBy, $sortDirection)->paginate($perPage);
    }

    public function create(array $validated): Customer
    {
        return Customer::create($validated)->fresh(['company', 'kyc']);
    }

    public function update(Customer $customer, array $validated): Customer
    {
        $customer->update($validated);

        return $customer->fresh(['company', 'kyc']);
    }

    public function delete(Customer $customer): void
    {
        $customer->delete();
    }
}
