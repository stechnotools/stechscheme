<?php

namespace App\Http\Controllers\API;

use App\Models\CustomerKyc;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class CustomerKycController extends CrudController
{
    protected string $modelClass = CustomerKyc::class;

    protected array $relations = ['customer.company'];

    protected array $filterable = ['customer_id', 'status', 'city', 'state'];

    protected array $sortable = ['id', 'customer_id', 'verified_at', 'created_at', 'updated_at'];

    protected function rules(?Model $model = null): array
    {
        return [
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'aadhaar_number' => ['nullable', 'string', 'max:32'],
            'pan_number' => ['nullable', 'string', 'max:32'],
            'aadhaar_file' => ['nullable', 'string', 'max:255'],
            'pan_file' => ['nullable', 'string', 'max:255'],
            'photo' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'pincode' => ['nullable', 'string', 'max:20'],
            'status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
            'remarks' => ['nullable', 'string'],
            'verified_at' => ['nullable', 'date'],
        ];
    }

    protected function applySearch($query, string $search): void
    {
        $query->where(function ($builder) use ($search) {
            $builder->where('aadhaar_number', 'like', "%{$search}%")
                ->orWhere('pan_number', 'like', "%{$search}%")
                ->orWhere('city', 'like', "%{$search}%")
                ->orWhere('state', 'like', "%{$search}%");
        });
    }
}
