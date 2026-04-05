<?php

namespace App\Http\Controllers\API;

use App\Models\Membership;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class MembershipController extends CrudController
{
    protected string $modelClass = Membership::class;

    protected array $relations = ['user.company', 'scheme.company', 'installments', 'payments'];

    protected array $filterable = ['user_id', 'scheme_id', 'status'];

    protected array $sortable = ['id', 'start_date', 'maturity_date', 'total_paid', 'created_at', 'updated_at'];

    protected function rules(?Model $model = null): array
    {
        return [
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'scheme_id' => ['required', 'integer', 'exists:schemes,id'],
            'start_date' => ['required', 'date'],
            'maturity_date' => ['required', 'date', 'after_or_equal:start_date'],
            'total_paid' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', Rule::in(['active', 'paused', 'completed', 'cancelled'])],
        ];
    }
}
