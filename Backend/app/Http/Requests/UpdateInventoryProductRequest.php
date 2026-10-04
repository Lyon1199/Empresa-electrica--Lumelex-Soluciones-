<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInventoryProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $product = $this->route('inventory_product');

        return [
            'sku' => ['sometimes', 'required', 'string', 'max:60', Rule::unique('inventory_products', 'sku')->ignore($product)],
            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'description' => ['sometimes', 'required', 'string', 'max:10000'],
            'category' => ['sometimes', 'required', 'string', 'max:100'],
            'unit' => ['sometimes', 'required', 'string', 'max:30'],
            'unit_price' => ['sometimes', 'required', 'numeric', 'min:0', 'max:100000000'],
            'stock_quantity' => ['sometimes', 'numeric', 'min:0', 'max:100000000'],
            'minimum_stock' => ['sometimes', 'numeric', 'min:0', 'max:100000000'],
            'active' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
