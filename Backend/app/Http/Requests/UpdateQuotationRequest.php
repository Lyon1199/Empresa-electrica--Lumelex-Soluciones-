<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateQuotationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $hasLaborEntries = is_array($this->input('internal_labor_entries'))
            && count($this->input('internal_labor_entries')) > 0;
        $legacyLaborRules = $this->boolean('internal_labor_enabled') && ! $hasLaborEntries
            ? ['required', 'integer', 'min:1', 'max:1000']
            : ['sometimes', 'nullable', 'integer', 'min:0', 'max:1000'];
        $legacyDaysRules = $this->boolean('internal_labor_enabled') && ! $hasLaborEntries
            ? ['required', 'numeric', 'gt:0', 'max:10000']
            : ['sometimes', 'nullable', 'numeric', 'min:0', 'max:10000'];
        $legacyRateRules = $this->boolean('internal_labor_enabled') && ! $hasLaborEntries
            ? ['required', 'numeric', 'gt:0', 'max:100000000']
            : ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100000000'];

        return [
            'customer_id' => [
                'nullable',
                'integer',
                Rule::exists('customers', 'id')->where('active', true),
            ],
            'customer_name' => ['nullable', 'string', 'max:180'],
            'customer_identification' => ['nullable', 'string', 'max:30'],
            'customer_email' => ['nullable', 'email', 'max:180'],
            'customer_address' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:150'],
            'requester' => ['nullable', 'string', 'max:180'],
            'payment_terms' => ['nullable', 'string', 'max:5000'],
            'title' => ['required', 'string', 'max:180'],
            'issue_date' => ['required', 'date'],
            'valid_until' => ['required', 'date', 'after_or_equal:issue_date'],
            'status' => [
                'required',
                Rule::in(['draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled']),
            ],
            'scope' => ['nullable', 'string', 'max:10000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'terms' => ['nullable', 'string', 'max:5000'],
            'discount_percent' => ['required', 'numeric', 'between:0,100'],
            'tax_percent' => ['required', 'numeric', 'between:0,100'],
            'markup_percent' => ['sometimes', 'numeric', 'between:0,1000'],
            'internal_labor_enabled' => ['sometimes', 'boolean'],
            'internal_worker_count' => $legacyLaborRules,
            'internal_work_days' => $legacyDaysRules,
            'internal_daily_rate' => $legacyRateRules,
            'internal_labor_entries' => ['nullable', 'array', 'max:100'],
            'internal_labor_entries.*.role' => ['required', 'string', 'max:120'],
            'internal_labor_entries.*.worker_count' => ['required', 'integer', 'min:1', 'max:1000'],
            'internal_labor_entries.*.work_days' => ['required', 'numeric', 'gt:0', 'max:10000'],
            'internal_labor_entries.*.daily_rate' => ['required', 'numeric', 'gt:0', 'max:100000000'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.category' => [
                'required_without:items.*.product_id',
                Rule::in(['material', 'labor', 'equipment', 'service', 'other']),
            ],
            'items.*.product_id' => [
                'nullable',
                'integer',
                Rule::exists('inventory_products', 'id')->where('active', true),
            ],
            'items.*.description' => ['required_without:items.*.product_id', 'string', 'max:10000'],
            'items.*.unit' => ['required_without:items.*.product_id', 'string', 'max:30'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:100000000'],
            'items.*.unit_price' => ['required_without:items.*.product_id', 'numeric', 'min:0', 'max:100000000'],
            'items.*.costing_enabled' => ['sometimes', 'boolean'],
            'items.*.internal_material_cost' => ['sometimes', 'numeric', 'min:0', 'max:100000000'],
            'items.*.internal_logistics_cost' => ['sometimes', 'numeric', 'min:0', 'max:100000000'],
            'items.*.internal_labor_entries' => ['nullable', 'array', 'max:100'],
            'items.*.internal_labor_entries.*.role' => ['required', 'string', 'max:120'],
            'items.*.internal_labor_entries.*.worker_count' => ['required', 'integer', 'min:1', 'max:1000'],
            'items.*.internal_labor_entries.*.work_days' => ['required', 'numeric', 'gt:0', 'max:10000'],
            'items.*.internal_labor_entries.*.daily_rate' => ['required', 'numeric', 'gt:0', 'max:100000000'],
        ];
    }
}
