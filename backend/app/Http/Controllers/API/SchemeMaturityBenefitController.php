<?php

namespace App\Http\Controllers\API;

use App\Models\SchemeMaturityBenefit;
use Illuminate\Database\Eloquent\Model;

class SchemeMaturityBenefitController extends CrudController
{
    protected string $modelClass = SchemeMaturityBenefit::class;

    protected array $relations = ['scheme'];

    protected array $filterable = ['scheme_id', 'month', 'type'];

    protected array $sortable = ['id', 'month', 'value', 'created_at', 'updated_at'];

    protected function rules(?Model $model = null): array
    {
        return [
            'scheme_id' => ['required', 'integer', 'exists:schemes,id'],
            'month' => ['required', 'integer', 'min:1'],
            'type' => ['required', 'in:percentage'],
            'value' => ['required', 'numeric', 'min:0'],
        ];
    }
}
