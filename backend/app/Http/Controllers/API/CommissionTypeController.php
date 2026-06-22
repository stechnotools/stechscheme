<?php

namespace App\Http\Controllers\API;

use App\Models\CommissionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class CommissionTypeController extends CrudController
{
    protected string $modelClass = CommissionType::class;

    protected array $filterable = ['status'];

    protected array $sortable = ['id', 'code', 'name', 'created_at', 'updated_at'];

    protected function rules(?Model $model = null): array
    {
        $typeId = $model?->getKey();

        return [
            'code' => ['required', 'string', 'max:50', Rule::unique('commission_types', 'code')->ignore($typeId)],
            'name' => ['required', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
        ];
    }
}
