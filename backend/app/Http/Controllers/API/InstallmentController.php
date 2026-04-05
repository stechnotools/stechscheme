<?php

namespace App\Http\Controllers\API;

use App\Models\Installment;
use Illuminate\Database\Eloquent\Model;

class InstallmentController extends CrudController
{
    protected string $modelClass = Installment::class;

    protected array $relations = ['membership.user', 'membership.scheme'];

    protected array $filterable = ['membership_id', 'installment_no', 'paid'];

    protected array $sortable = ['id', 'installment_no', 'due_date', 'amount', 'created_at', 'updated_at'];

    protected function rules(?Model $model = null): array
    {
        return [
            'membership_id' => ['required', 'integer', 'exists:memberships,id'],
            'installment_no' => ['required', 'integer', 'min:1'],
            'due_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0'],
            'paid' => ['sometimes', 'boolean'],
            'paid_date' => ['nullable', 'date'],
            'penalty' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
