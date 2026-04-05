<?php

namespace App\Http\Requests\Kyc;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreKycRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
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
}
