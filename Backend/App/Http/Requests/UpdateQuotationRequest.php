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
        return [
            'customer_id' => [
                'required',
                'integer',
                Rule::exists('customers', 'id')
                    ->where('active', true),
            ],
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
            'internal_labor_enabled' => ['sometimes', 'boolean'],
            'internal_worker_count' => ['required_if:internal_labor_enabled,true', 'integer', 'min:1', 'max:1000'],
            'internal_work_days' => ['required_if:internal_labor_enabled,true', 'numeric', 'gt:0', 'max:10000'],
            'internal_daily_rate' => ['required_if:internal_labor_enabled,true', 'numeric', 'gt:0', 'max:100000000'],
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
        ];
    }
}
