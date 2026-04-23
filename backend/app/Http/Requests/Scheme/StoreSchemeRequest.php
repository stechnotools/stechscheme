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
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:255', Rule::unique('schemes', 'code')->ignore($schemeId)],
            'description' => ['nullable', 'string', 'max:500'],
            'installment_value' => ['required', 'numeric', 'min:0'],
            'min_installment_value' => ['nullable', 'numeric', 'min:0'],
            'total_installments' => ['required', 'integer', 'min:1'],
            'free_installments' => ['nullable', 'integer', 'min:0'],
            'max_installments' => ['nullable', 'integer', 'min:1'],
            'scheme_type' => ['required', 'string', 'max:100'],
            'item_group' => ['nullable', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'termination_date' => ['nullable', 'date'],
            'is_closed' => ['sometimes', 'boolean'],
            'no_of_installment_type' => ['required', 'in:Fix,Variable'],
            'min_no_of_installments' => ['nullable', 'integer', 'min:0'],
            'installment_code' => ['nullable', 'string', 'max:50'],
            'installment_base' => ['nullable', 'string', 'max:50'],
            'installment_duration' => ['nullable', 'string', 'max:50'],
            'first_installment_multiple_of' => ['nullable', 'numeric', 'min:0'],
            'grace_days' => ['nullable', 'integer', 'min:0'],
            'closing_penalty' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'allow_overdue' => ['sometimes', 'boolean'],
            'late_fee_effect_account' => ['nullable', 'string', 'max:255'],
            'late_fee_type' => ['nullable', 'in:fixed,percentage'],
            'late_fee_value' => ['nullable', 'numeric', 'min:0'],
            'wt_booked_with_gst' => ['sometimes', 'boolean'],
            'gold_rate_policy' => ['nullable', 'in:enrollment_rate,closing_rate'],
            'maturity_months_after_last_installment' => ['nullable', 'integer', 'min:0'],
            'apply_rate' => ['nullable', 'string', 'max:100'],
            'allow_change_rate_closing' => ['sometimes', 'boolean'],
            'advance_closure_account' => ['nullable', 'string', 'max:255'],
            'allow_bonus' => ['sometimes', 'boolean'],
            'benefit_type' => ['nullable', 'string', 'max:100'],
            'benefit_mode' => ['nullable', 'string', 'max:100'],
            'bonus_no_of_installments' => ['nullable', 'integer', 'min:0'],
            'bonus_effect_account' => ['nullable', 'string', 'max:255'],
            'effect_to_account' => ['nullable', 'string', 'max:255'],
            'interest_receivable_account' => ['nullable', 'string', 'max:255'],
            'advertisement_publicity_account' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
