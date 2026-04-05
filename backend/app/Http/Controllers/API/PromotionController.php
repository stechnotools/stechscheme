<?php

namespace App\Http\Controllers\API;

use App\Models\Promotion;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class PromotionController extends CrudController
{
    protected string $modelClass = Promotion::class;

    protected array $filterable = ['type'];

    protected array $sortable = ['id', 'name', 'type', 'value', 'start_date', 'end_date', 'created_at', 'updated_at'];

    protected function rules(?Model $model = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['percentage', 'flat'])],
            'value' => ['required', 'numeric', 'min:0'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ];
    }
}
