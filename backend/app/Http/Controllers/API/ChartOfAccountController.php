<?php

namespace App\Http\Controllers\API;

use App\Models\ChartOfAccount;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

class ChartOfAccountController extends CrudController
{
    protected string $modelClass = ChartOfAccount::class;

    protected array $relations = ['parent'];

    protected array $filterable = ['parent_id', 'account_type', 'is_active', 'source_type'];

    protected array $sortable = ['id', 'name', 'code', 'account_type', 'parent_id', 'created_at', 'updated_at'];

    protected function rules(?Model $model = null): array
    {
        $chartOfAccountId = $model?->getKey();

        return [
            'parent_id' => [
                'nullable',
                'integer',
                'exists:chart_of_accounts,id',
                function (string $attribute, mixed $value, \Closure $fail) use ($model) {
                    if (! $value) {
                        return;
                    }

                    if ($model && (int) $value === (int) $model->getKey()) {
                        $fail('Parent account cannot be itself.');
                    }
                },
            ],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:100', Rule::unique('chart_of_accounts', 'code')->ignore($chartOfAccountId)],
            'account_type' => ['required', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
            'source_type' => ['nullable', 'string', 'max:50'],
            'source_id' => ['nullable', 'integer'],
            'remarks' => ['nullable', 'string'],
        ];
    }

    protected function applySearch($query, string $search): void
    {
        $query->where(function ($builder) use ($search) {
            $builder->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%")
                ->orWhere('account_type', 'like', "%{$search}%");
        });
    }
}
