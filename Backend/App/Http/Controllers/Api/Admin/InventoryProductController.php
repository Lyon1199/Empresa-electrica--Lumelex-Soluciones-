<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdjustInventoryStockRequest;
use App\Http\Requests\StoreInventoryProductRequest;
use App\Http\Requests\UpdateInventoryProductRequest;
use App\Models\InventoryProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class InventoryProductController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:150'],
            'category' => ['sometimes', 'string', 'max:100'],
            'low_stock' => ['sometimes', 'boolean'],
            'active' => ['sometimes', 'boolean'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = InventoryProduct::query();

        if (isset($filters['search']) && $filters['search'] !== '') {
            $search = $filters['search'];
            $query->where(function ($query) use ($search) {
                $query->where('sku', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }
        if (isset($filters['category'])) {
            $query->where('category', $filters['category']);
        }
        if (isset($filters['active'])) {
            $query->where('active', $filters['active']);
        }
        if (! empty($filters['low_stock'])) {
            $query->whereColumn('stock_quantity', '<=', 'minimum_stock');
        }

        return response()->json($query->orderBy('name')->paginate($filters['per_page'] ?? 25));
    }

    public function store(StoreInventoryProductRequest $request)
    {
        $data = $request->validated();
        $data['active'] = $data['is_active'] ?? $data['active'] ?? true;
        unset($data['is_active']);

        $product = InventoryProduct::create($data);

        return response()->json(['data' => $product], 201);
    }

    public function show(InventoryProduct $inventoryProduct)
    {
        return response()->json([
            'data' => $inventoryProduct->load(['adjustments' => fn ($query) => $query->with('adjustedBy')->latest()->limit(50)]),
        ]);
    }

    public function update(UpdateInventoryProductRequest $request, InventoryProduct $inventoryProduct)
    {
        $data = $request->validated();
        if (array_key_exists('is_active', $data)) {
            $data['active'] = $data['is_active'];
            unset($data['is_active']);
        }

        if (array_key_exists('stock_quantity', $data) && (float) $data['stock_quantity'] !== (float) $inventoryProduct->stock_quantity) {
            return response()->json([
                'message' => 'Use el endpoint de ajuste para cambiar existencias y registrar el motivo.',
                'errors' => ['stock_quantity' => ['El inventario debe modificarse mediante un ajuste auditable.']],
            ], 422);
        }

        $inventoryProduct->update($data);

        return response()->json(['data' => $inventoryProduct->refresh()]);
    }

    public function uploadImage(Request $request, InventoryProduct $inventoryProduct)
    {
        $validated = $request->validate([
            'image' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
                'dimensions:max_width=3000,max_height=3000',
            ],
        ]);

        $previousPath = $inventoryProduct->image_path;
        $newPath = $validated['image']->store(
            "inventory-products/{$inventoryProduct->id}",
            'public'
        );

        if (! $newPath) {
            throw new RuntimeException('No se pudo guardar la imagen del producto.');
        }

        try {
            $inventoryProduct->update(['image_path' => $newPath]);
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($newPath);
            throw $exception;
        }

        if ($previousPath && ! Storage::disk('public')->delete($previousPath)) {
            throw new RuntimeException('La imagen se actualizó, pero no se pudo eliminar el archivo anterior.');
        }

        return response()->json(['data' => $inventoryProduct->refresh()], 200);
    }

    public function deleteImage(InventoryProduct $inventoryProduct)
    {
        if ($inventoryProduct->image_path && ! Storage::disk('public')->delete($inventoryProduct->image_path)) {
            throw new RuntimeException('No se pudo eliminar el archivo de imagen del producto.');
        }

        $inventoryProduct->update(['image_path' => null]);

        return response()->json(['data' => $inventoryProduct->refresh()]);
    }

    public function destroy(InventoryProduct $inventoryProduct)
    {
        $inventoryProduct->update(['active' => false]);

        return response()->json(['message' => 'Producto desactivado correctamente.']);
    }

    public function lowStock()
    {
        return response()->json([
            'data' => InventoryProduct::query()
                ->where('active', true)
                ->whereColumn('stock_quantity', '<=', 'minimum_stock')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function adjust(AdjustInventoryStockRequest $request, InventoryProduct $inventoryProduct)
    {
        $adjustment = DB::transaction(function () use ($request, $inventoryProduct) {
            $product = InventoryProduct::query()->lockForUpdate()->findOrFail($inventoryProduct->id);
            $data = $request->validated();
            $before = (float) $product->stock_quantity;
            $change = (float) $data['quantity_change'];
            $after = round($before + $change, 3);

            if ($after < 0) {
                abort(422, 'El ajuste no puede dejar existencias negativas.');
            }

            $product->update(['stock_quantity' => $after]);

            return $product->adjustments()->create([
                'adjusted_by' => $request->user()?->id,
                'quantity_change' => $change,
                'quantity_before' => $before,
                'quantity_after' => $after,
                'reason' => $data['reason'],
            ]);
        });

        return response()->json([
            'data' => $adjustment->load('product', 'adjustedBy'),
        ], 201);
    }
}
