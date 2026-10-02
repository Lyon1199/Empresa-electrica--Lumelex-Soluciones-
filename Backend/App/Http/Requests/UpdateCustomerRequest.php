<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $customerId = $this->route('customer')?->id;

        return [
            'name' => [
                'required',
                'string',
                'max:150',
            ],

            'customer_type' => [
                'required',
                'in:person,company',
            ],

            'identification' => [
                'required',
                'string',
                'max:20',
                Rule::unique('customers', 'identification')
                    ->ignore($customerId),
            ],

            'email' => [
                'nullable',
                'email',
                'max:150',
            ],

            'phone' => [
                'nullable',
                'string',
                'max:30',
            ],

            'address' => [
                'nullable',
                'string',
                'max:255',
            ],

            'city' => [
                'nullable',
                'string',
                'max:100',
            ],

            'contact_person' => [
                'nullable',
                'string',
                'max:150',
            ],

            'contact_phone' => [
                'nullable',
                'string',
                'max:30',
            ],

            'notes' => [
                'nullable',
                'string',
            ],

            'active' => [
                'sometimes',
                'boolean',
            ],
        ];
    }
}