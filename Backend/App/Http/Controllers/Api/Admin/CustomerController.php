<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    /**
     * Listar clientes
     */
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:150'],
            'customer_type' => [
                'sometimes',
                'required',
                'in:person,company',
            ],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Customer::query();

        if (isset($filters['customer_type'])) {
            $query->where(
                'customer_type',
                $filters['customer_type']
            );
        }

        if (! empty($filters['search'])) {
            $search = mb_strtolower($filters['search']);

            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(identification) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(email) LIKE ?', ["%{$search}%"]);
            });
        }

        if ($request->has('active')) {
            $query->where(
                'active',
                filter_var(
                    $request->active,
                    FILTER_VALIDATE_BOOLEAN
                )
            );
        }

        $customers = $query
            ->orderBy('name')
            ->paginate($filters['per_page'] ?? 15);

        return response()->json($customers);
    }

    /**
     * Crear cliente
     */
    public function store(StoreCustomerRequest $request)
    {
        $customer = Customer::create(
            $request->validated()
        );

        return response()->json([
            'message' => 'Cliente creado correctamente.',
            'data' => $customer,
        ], 201);
    }

    /**
     * Mostrar cliente
     */
    public function show(Customer $customer)
    {
        return response()->json([
            'data' => $customer,
        ]);
    }

    /**
     * Actualizar cliente
     */
    public function update(
        UpdateCustomerRequest $request,
        Customer $customer
    ) {
        $customer->update(
            $request->validated()
        );

        return response()->json([
            'message' => 'Cliente actualizado correctamente.',
            'data' => $customer->fresh(),
        ]);
    }

    /**
     * Eliminar cliente
     */
    public function destroy(Customer $customer)
    {
        $customer->delete();

        return response()->json([
            'message' => 'Cliente eliminado correctamente.',
        ]);
    }
}