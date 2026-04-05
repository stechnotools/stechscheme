<?php

namespace App\Services;

use App\Models\Scheme;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class SchemeService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = Scheme::query()->with(['company', 'maturityBenefits', 'memberships']);

        foreach (['company_id', 'scheme_type', 'allow_overdue'] as $field) {
            if (array_key_exists($field, $filters) && $filters[$field] !== null && $filters[$field] !== '') {
                $query->where($field, $filters[$field]);
            }
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('scheme_type', 'like', "%{$search}%");
            });
        }

        $perPage = max(1, min((int) ($filters['per_page'] ?? 15), 100));

        return $query->latest('id')->paginate($perPage);
    }

    public function create(array $validated): Scheme
    {
        return Scheme::create($validated)->fresh(['company', 'maturityBenefits', 'memberships']);
    }

    public function update(Scheme $scheme, array $validated): Scheme
    {
        $scheme->update($validated);

        return $scheme->fresh(['company', 'maturityBenefits', 'memberships']);
    }
}
