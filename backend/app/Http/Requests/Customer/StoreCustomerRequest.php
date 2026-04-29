<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'mobile' => ['required', 'string', 'max:20', 'unique:customers,mobile', 'unique:users,mobile'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'blocked'])],
            'portal_enabled' => ['nullable', 'boolean'],
            'portal_password' => ['nullable', 'string', 'min:6'],
            'branch_id' => ['nullable', 'integer', Rule::exists('branches', 'id')],
            'feedback' => ['nullable', 'string'],
            'kyc' => ['nullable', 'array'],
            'kyc.family_head' => ['nullable', 'string', 'max:255'],
            'kyc.contact_name_1' => ['nullable', 'string', 'max:255'],
            'kyc.contact_name_2' => ['nullable', 'string', 'max:255'],
            'kyc.mobile_no_1' => ['nullable', 'string', 'max:20'],
            'kyc.mobile_no_2' => ['nullable', 'string', 'max:20'],
            'kyc.std_code' => ['nullable', 'string', 'max:20'],
            'kyc.phone_no_1' => ['nullable', 'string', 'max:20'],
            'kyc.phone_no_2' => ['nullable', 'string', 'max:20'],
            'kyc.phone_no_3' => ['nullable', 'string', 'max:20'],
            'kyc.phone_no_4' => ['nullable', 'string', 'max:20'],
            'kyc.phone_no_5' => ['nullable', 'string', 'max:20'],
            'kyc.fax_no_1' => ['nullable', 'string', 'max:20'],
            'kyc.fax_no_2' => ['nullable', 'string', 'max:20'],
            'kyc.email_1' => ['nullable', 'string', 'max:255'],
            'kyc.email_2' => ['nullable', 'string', 'max:255'],
            'kyc.reference_1' => ['nullable', 'string', 'max:255'],
            'kyc.reference_2' => ['nullable', 'string', 'max:255'],
            'kyc.block_no' => ['nullable', 'string', 'max:255'],
            'kyc.building_name' => ['nullable', 'string', 'max:255'],
            'kyc.address' => ['nullable', 'string'],
            'kyc.area' => ['nullable', 'string', 'max:255'],
            'kyc.city' => ['nullable', 'string', 'max:255'],
            'kyc.state' => ['nullable', 'string', 'max:255'],
            'kyc.pincode' => ['nullable', 'string', 'max:20'],
            'kyc.country' => ['nullable', 'string', 'max:255'],
            'kyc.nominee_name' => ['nullable', 'string', 'max:255'],
            'kyc.nominee_relation' => ['nullable', 'string', 'max:255'],
            'kyc.nominee_mobile_1' => ['nullable', 'string', 'max:20'],
            'kyc.nominee_mobile_2' => ['nullable', 'string', 'max:20'],
            'kyc.nominee_block_no' => ['nullable', 'string', 'max:255'],
            'kyc.nominee_building_name' => ['nullable', 'string', 'max:255'],
            'kyc.nominee_street' => ['nullable', 'string'],
            'kyc.nominee_area' => ['nullable', 'string', 'max:255'],
            'kyc.nominee_city' => ['nullable', 'string', 'max:255'],
            'kyc.nominee_zip_code' => ['nullable', 'string', 'max:20'],
            'kyc.nominee_state' => ['nullable', 'string', 'max:255'],
            'kyc.nominee_country' => ['nullable', 'string', 'max:255'],
            'kyc.birth_date' => ['nullable', 'date'],
            'kyc.anniversary' => ['nullable', 'date'],
            'kyc.spouse_name' => ['nullable', 'string', 'max:255'],
            'kyc.child_name_1' => ['nullable', 'string', 'max:255'],
            'kyc.child_1_birth_date' => ['nullable', 'date'],
            'kyc.child_name_2' => ['nullable', 'string', 'max:255'],
            'kyc.child_2_birth_date' => ['nullable', 'date'],
            'kyc.aadhaar_number' => ['nullable', 'string', 'max:32'],
            'kyc.pan_number' => ['nullable', 'string', 'max:32'],
            'kyc.photo' => ['nullable', 'string', 'max:255'],
            'kyc.pan_file' => ['nullable', 'string', 'max:255'],
            'kyc.aadhaar_file' => ['nullable', 'string', 'max:255'],
            'kyc.driving_licence' => ['nullable', 'string', 'max:255'],
            'kyc.election_card' => ['nullable', 'string', 'max:255'],
            'kyc.passport_no' => ['nullable', 'string', 'max:255'],
            'kyc.it_pan_no' => ['nullable', 'string', 'max:255'],
            'kyc.remarks' => ['nullable', 'string'],
        ];
    }
}
