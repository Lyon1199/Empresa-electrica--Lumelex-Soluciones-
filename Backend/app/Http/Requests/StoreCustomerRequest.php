<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerRequest extends FormRequest
{
    public function messages(): array
    {
        return [
            'phone.regex' => 'El teléfono debe contener exactamente 10 dígitos.',
            'contact_phone.regex' => 'El teléfono de contacto debe contener exactamente 10 dígitos.',
        ];
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
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
                'unique:customers,identification',
            ],

            'email' => [
                'nullable',
                'email',
                'max:150',
            ],

            'phone' => [
                'nullable',
                'regex:/^\d{10}$/',
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
                'regex:/^\d{10}$/',
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
