<?php

namespace App\Http\Controllers\API;

use App\Models\Company;
use Illuminate\Database\Eloquent\Model;

class CompanyController extends CrudController
{
    protected string $modelClass = Company::class;

    protected array $relations = ['users', 'customers', 'schemes', 'products'];

    protected array $filterable = ['email', 'phone'];

    protected array $sortable = ['id', 'name', 'created_at', 'updated_at'];

    protected function rules(?Model $model = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'logo' => ['nullable', 'string', 'max:255'],
        ];
    }

    protected function applySearch($query, string $search): void
    {
        $query->where(function ($builder) use ($search) {
            $builder->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%");
        });
    }
}
