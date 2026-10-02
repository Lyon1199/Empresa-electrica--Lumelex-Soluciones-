<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInventoryProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sku' => ['required', 'string', 'max:60', 'unique:inventory_products,sku'],
            'name' => ['required', 'string', 'max:180'],
            'description' => ['required', 'string', 'max:10000'],
            'category' => ['required', 'string', 'max:100'],
            'unit' => ['required', 'string', 'max:30'],
            'unit_price' => ['required', 'numeric', 'min:0', 'max:100000000'],
            'stock_quantity' => ['sometimes', 'numeric', 'min:0', 'max:100000000'],
            'minimum_stock' => ['sometimes', 'numeric', 'min:0', 'max:100000000'],
            'active' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
