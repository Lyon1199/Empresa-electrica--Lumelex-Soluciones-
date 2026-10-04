<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdjustInventoryStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'quantity_change' => ['required', 'numeric', 'not_in:0', 'between:-100000000,100000000'],
            'reason' => ['required', 'string', 'max:500'],
        ];
    }
}
