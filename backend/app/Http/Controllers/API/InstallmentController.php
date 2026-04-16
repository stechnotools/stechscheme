<?php

namespace App\Http\Controllers\API;

use App\Models\Installment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InstallmentController extends CrudController
{
    protected string $modelClass = Installment::class;

    protected array $relations = ['membership.customer', 'membership.scheme', 'payments'];

    protected array $filterable = ['membership_id', 'installment_no', 'paid'];

    protected array $sortable = ['id', 'installment_no', 'due_date', 'amount', 'created_at', 'updated_at'];

    public function index(Request $request): JsonResponse
    {
        $query = $this->newQuery();

        foreach ($this->filterable as $field) {
            if ($request->filled($field)) {
                $query->where($field, $request->input($field));
            }
        }

        if ($request->filled('customer_id')) {
            $query->whereHas('membership', fn ($builder) => $builder->where('customer_id', (int) $request->input('customer_id')));
        }

        if ($request->boolean('overdue')) {
            $query->where('paid', false)->whereDate('due_date', '<', now()->toDateString());
        }

        if ($request->filled('date_from')) {
            $query->whereDate('due_date', '>=', (string) $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('due_date', '<=', (string) $request->input('date_to'));
        }

        $sortBy = $request->input('sort_by', 'due_date');
        $sortDirection = strtolower((string) $request->input('sort_direction', 'asc')) === 'desc' ? 'desc' : 'asc';

        if (in_array($sortBy, $this->sortable, true)) {
            $query->orderBy($sortBy, $sortDirection);
        }

        $perPage = max(1, min((int) $request->input('per_page', $this->defaultPerPage), 100));

        return response()->json($query->paginate($perPage));
    }

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
