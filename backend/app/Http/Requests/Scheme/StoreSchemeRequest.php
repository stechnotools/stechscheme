<?php

namespace App\Http\Requests\Scheme;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSchemeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $schemeId = $this->route('scheme') ?? $this->route('id');

        return [
            'company_id' => ['required', 'integer', 'exists:companies,id'],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:255', Rule::unique('schemes', 'code')->ignore($schemeId)],
            'installment_value' => ['required', 'numeric', 'min:0'],
            'total_installments' => ['required', 'integer', 'min:1'],
            'scheme_type' => ['required', 'string', 'max:100'],
            'grace_days' => ['nullable', 'integer', 'min:0'],
            'allow_overdue' => ['sometimes', 'boolean'],
        ];
    }
}
