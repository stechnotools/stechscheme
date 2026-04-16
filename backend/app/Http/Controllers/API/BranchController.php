<?php

namespace App\Http\Controllers\API;

use App\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class BranchController extends CrudController
{
    protected string $modelClass = Branch::class;

    protected array $relations = ['users:id,name,email,mobile'];

    protected array $filterable = ['status', 'city'];

    protected array $sortable = ['id', 'name', 'code', 'city', 'created_at', 'updated_at'];

    protected function rules(?Model $model = null): array
    {
        $branchId = $model?->getKey();

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:100', Rule::unique('branches', 'code')->ignore($branchId)],
            'city' => ['nullable', 'string', 'max:255'],
            'manager_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
        ];
    }

    protected function applySearch($query, string $search): void
    {
        $query->where(function ($builder) use ($search) {
            $builder->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%")
                ->orWhere('city', 'like', "%{$search}%")
                ->orWhere('manager_name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%");
        });
    }
}
