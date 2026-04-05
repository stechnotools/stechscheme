<?php

namespace App\Http\Controllers\API;

use App\Models\Payment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class PaymentController extends CrudController
{
    protected string $modelClass = Payment::class;

    protected array $relations = ['membership.user', 'membership.scheme'];

    protected array $filterable = ['membership_id', 'gateway', 'status'];

    protected array $sortable = ['id', 'amount', 'payment_date', 'created_at', 'updated_at'];

    protected function rules(?Model $model = null): array
    {
        return [
            'membership_id' => ['required', 'integer', 'exists:memberships,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'gateway' => ['nullable', 'string', 'max:100'],
            'transaction_id' => ['nullable', 'string', 'max:255'],
            'payment_date' => ['required', 'date'],
            'status' => ['required', Rule::in(['pending', 'success', 'failed', 'refunded'])],
        ];
    }
}
