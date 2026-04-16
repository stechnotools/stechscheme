<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $customerId = $this->route('customer') ?? $this->route('id');
        $customer = \App\Models\Customer::query()->find($customerId);
        $linkedUser = null;

        if ($customer) {
            $linkedUser = $customer->user_id ? \App\Models\User::query()->find($customer->user_id) : null;
        }

        return [
            'name' => ['nullable', 'string', 'max:255'],
            'mobile' => [
                'required',
                'string',
                'max:20',
                Rule::unique('customers', 'mobile')->ignore($customerId),
                Rule::unique('users', 'mobile')->ignore($linkedUser?->id),
            ],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($linkedUser?->id)],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'blocked'])],
            'portal_enabled' => ['nullable', 'boolean'],
            'portal_password' => ['nullable', 'string', 'min:6'],
            'branch_id' => ['nullable', 'integer', Rule::exists('branches', 'id')],
        ];
    }
}
