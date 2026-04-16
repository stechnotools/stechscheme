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
            'aadhaar_number' => ['nullable', 'regex:/^\d{12}$/'],
            'pan_number' => ['nullable', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]$/'],
            'aadhaar_file' => ['nullable', 'file', 'mimes:pdf', 'max:5120'],
            'pan_file' => ['nullable', 'file', 'mimes:pdf', 'max:5120'],
            'photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
            'existing_aadhaar_file' => ['nullable', 'string', 'max:255', 'regex:/^.+\.pdf$/i'],
            'existing_pan_file' => ['nullable', 'string', 'max:255', 'regex:/^.+\.pdf$/i'],
            'existing_photo' => ['nullable', 'string', 'max:255', 'regex:/^.+\.(jpg|jpeg|png)$/i'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'pincode' => ['nullable', 'string', 'max:20'],
            'status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
            'remarks' => ['nullable', 'string'],
            'verified_at' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'aadhaar_number.regex' => 'Aadhaar number must be exactly 12 digits.',
            'pan_number.regex' => 'PAN number must be in format AAAAA9999A.',
            'aadhaar_file.mimes' => 'Aadhaar file must be a PDF.',
            'pan_file.mimes' => 'PAN file must be a PDF.',
            'photo.mimes' => 'Photo must be a JPG, JPEG, or PNG file.',
            'existing_aadhaar_file.regex' => 'Aadhaar file must be a PDF.',
            'existing_pan_file.regex' => 'PAN file must be a PDF.',
            'existing_photo.regex' => 'Photo must be a JPG, JPEG, or PNG file.',
        ];
    }
}
