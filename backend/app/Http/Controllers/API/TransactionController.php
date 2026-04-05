<?php

namespace App\Http\Controllers\API;

use App\Models\Transaction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class TransactionController extends CrudController
{
    protected string $modelClass = Transaction::class;

    protected array $relations = ['user.company'];

    protected array $filterable = ['user_id', 'type'];

    protected array $sortable = ['id', 'amount', 'created_at', 'updated_at'];

    protected function rules(?Model $model = null): array
    {
        return [
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'type' => ['required', Rule::in(['credit', 'debit'])],
            'amount' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
        ];
    }
}
