<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\InventoryProduct;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\InventoryProductSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class InventoryQuotationTest extends TestCase
{
    use RefreshDatabase;

    public function test_inventory_crud_search_low_stock_and_audited_adjustments_are_authorized(): void
    {
        $bodega = $this->createUserWithRole('bodega');
        $this->actingAs($bodega, 'web');

        $created = $this->postJson('/api/inventory-products', [
            'sku' => 'BRK-TEST-2P20',
            'name' => 'Breaker bipolar 20 A',
            'description' => 'Interruptor termomagnético de dos polos y veinte amperios para riel DIN.',
            'category' => 'Protecciones',
            'unit' => 'unidad',
            'unit_price' => 14.25,
            'stock_quantity' => 3,
            'minimum_stock' => 3,
            'is_active' => true,
        ])->assertCreated()
            ->assertJsonPath('data.low_stock', true)
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.stock_status', 'low_stock');

        $productId = $created->json('data.id');
        $this->getJson('/api/inventory-products?search=BRK-TEST')
            ->assertOk()
            ->assertJsonCount(1, 'data');
        $this->getJson('/api/inventory-products/low-stock')
            ->assertOk()
            ->assertJsonPath('data.0.id', $productId);

        $this->postJson("/api/inventory-products/{$productId}/adjustments", [
            'quantity_change' => -1,
            'reason' => 'Salida para orden de trabajo OT-25',
        ])->assertCreated()
            ->assertJsonPath('data.quantity_before', '3.000')
            ->assertJsonPath('data.quantity_after', '2.000')
            ->assertJsonPath('data.reason', 'Salida para orden de trabajo OT-25');

        $this->assertDatabaseHas('inventory_stock_adjustments', [
            'inventory_product_id' => $productId,
            'adjusted_by' => $bodega->id,
            'quantity_change' => -1,
            'quantity_before' => 3,
            'quantity_after' => 2,
        ]);
        $this->assertDatabaseHas('inventory_products', [
            'id' => $productId,
            'stock_quantity' => 2,
        ]);
        $this->putJson("/api/inventory-products/{$productId}", [
            'stock_quantity' => 20,
        ])->assertUnprocessable();
        $this->putJson("/api/inventory-products/{$productId}", [
            'unit_price' => 15.50,
        ])->assertOk()
            ->assertJsonPath('data.unit_price', '15.5000');

        $customer = $this->createUserWithRole('cliente');
        $this->flushSession();
        Auth::forgetGuards();
        $this->actingAs($customer, 'web');
        $this->getJson('/api/inventory-products')->assertForbidden();
        $this->postJson('/api/inventory-products', [])->assertForbidden();
    }

    public function test_seeded_electrical_catalog_is_available_and_reseeding_preserves_stock(): void
    {
        $this->seed(InventoryProductSeeder::class);
        $this->actingAs($this->createUserWithRole('bodega'), 'web');

        $this->getJson('/api/inventory-products?per_page=100')
            ->assertOk()
            ->assertJsonCount(36, 'data');

        $product = InventoryProduct::where('sku', 'BRK-2P-20A')->firstOrFail();
        $product->update([
            'stock_quantity' => 7,
            'minimum_stock' => 3,
            'active' => false,
        ]);

        $this->seed(InventoryProductSeeder::class);

        $this->assertDatabaseHas('inventory_products', [
            'sku' => 'BRK-2P-20A',
            'stock_quantity' => 7,
            'minimum_stock' => 3,
            'active' => false,
        ]);
    }

    public function test_inventory_product_images_can_be_uploaded_replaced_and_removed(): void
    {
        Storage::fake('public');
        $this->actingAs($this->createUserWithRole('bodega'), 'web');
        $product = InventoryProduct::create([
            'sku' => 'IMAGE-TEST',
            'name' => 'Breaker de prueba',
            'description' => 'Breaker para validar carga de imágenes.',
            'category' => 'Protecciones',
            'unit' => 'unidad',
            'unit_price' => 10,
            'stock_quantity' => 5,
            'minimum_stock' => 1,
            'active' => true,
        ]);

        $uploaded = $this->postJson("/api/inventory-products/{$product->id}/image", [
            'image' => UploadedFile::fake()->image('breaker.png', 300, 300),
        ])->assertOk()
            ->assertJsonPath('data.name', 'Breaker de prueba');

        $this->assertStringContainsString('/storage/inventory-products/', $uploaded->json('data.image_url'));
        $firstPath = $uploaded->json('data.image_path');
        Storage::disk('public')->assertExists($firstPath);

        $replacement = $this->postJson("/api/inventory-products/{$product->id}/image", [
            'image' => UploadedFile::fake()->image('breaker-new.webp', 300, 300),
        ])->assertOk();

        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($replacement->json('data.image_path'));

        $this->deleteJson("/api/inventory-products/{$product->id}/image")
            ->assertOk()
            ->assertJsonPath('data.image_path', null)
            ->assertJsonPath('data.image_url', null);
        Storage::disk('public')->assertMissing($replacement->json('data.image_path'));
    }

    public function test_inventory_product_images_are_validated_and_protected_by_inventory_roles(): void
    {
        Storage::fake('public');
        $product = InventoryProduct::create([
            'sku' => 'IMAGE-AUTH',
            'name' => 'Producto de prueba',
            'description' => 'Producto.',
            'category' => 'Accesorios',
            'unit' => 'unidad',
            'unit_price' => 1,
            'stock_quantity' => 1,
            'minimum_stock' => 0,
            'active' => true,
        ]);

        $this->actingAs($this->createUserWithRole('cliente'), 'web');
        $this->postJson("/api/inventory-products/{$product->id}/image", [
            'image' => UploadedFile::fake()->image('producto.png'),
        ])->assertForbidden();

        $this->flushSession();
        Auth::forgetGuards();
        $this->actingAs($this->createUserWithRole('bodega'), 'web');
        $this->postJson("/api/inventory-products/{$product->id}/image", [
            'image' => UploadedFile::fake()->create('producto.svg', 50, 'image/svg+xml'),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('image');
    }

    public function test_inventory_requires_authentication_and_accepts_only_valid_active_products_on_quotes(): void
    {
        $this->getJson('/api/inventory-products')->assertUnauthorized();

        $this->actingAs($this->createUserWithRole('gerente'), 'web');
        $product = InventoryProduct::create([
            'sku' => 'WIRE-SNAPSHOT-12',
            'name' => 'Cable THHN calibre 12 AWG',
            'description' => str_repeat('Conductor de cobre THHN/THWN-2 calibre 12 AWG, aislamiento 600 V. ', 5),
            'category' => 'Conductores',
            'unit' => 'metro',
            'unit_price' => 0.6845,
            'stock_quantity' => 100,
            'minimum_stock' => 10,
            'active' => true,
        ]);
        $customer = $this->createCustomer('Cliente destino');

        $payload = $this->quotationPayload($customer);
        $payload['items'][0] = [
            'product_id' => $product->id,
            'quantity' => 4,
        ];

        $this->postJson('/api/quotations', $payload)
            ->assertCreated()
            ->assertJsonPath('data.items.0.product_id', $product->id)
            ->assertJsonPath('data.items.0.description', $product->description)
            ->assertJsonPath('data.items.0.unit', 'metro')
            ->assertJsonPath('data.items.0.unit_price', '0.6845');

        $product->update(['active' => false]);
        $payload['items'][0]['description'] = 'Texto modificado';
        $this->postJson('/api/quotations', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items.0.product_id']);
    }

    public function test_quotation_clone_copies_snapshots_for_another_customer_as_an_independent_draft(): void
    {
        $this->actingAs($this->createUserWithRole('admin'), 'web');
        $originalCustomer = $this->createCustomer('Cliente original');
        $newCustomer = $this->createCustomer('Nuevo cliente');
        $product = InventoryProduct::create([
            'sku' => 'OUTLET-SNAPSHOT',
            'name' => 'Tomacorriente doble',
            'description' => 'Receptáculo dúplex polarizado de 15 A, 125 V, con conexión a tierra y placa estándar.',
            'category' => 'Tomacorrientes',
            'unit' => 'unidad',
            'unit_price' => 3.8,
            'stock_quantity' => 20,
            'minimum_stock' => 5,
            'active' => true,
        ]);

        $payload = $this->quotationPayload($originalCustomer);
        $payload['status'] = 'draft';
        $payload['internal_labor_enabled'] = true;
        $payload['internal_worker_count'] = 1;
        $payload['internal_work_days'] = 2;
        $payload['internal_daily_rate'] = 50;
        $payload['items'][0] = [
            'product_id' => $product->id,
            'category' => 'material',
            'description' => $product->description,
            'unit' => $product->unit,
            'quantity' => 2,
            'unit_price' => $product->unit_price,
        ];
        $original = $this->postJson('/api/quotations', $payload)->assertCreated()->json('data');
        \App\Models\Quotation::findOrFail($original['id'])->update(['status' => 'sent']);

        $clone = $this->postJson("/api/quotations/{$original['id']}/clone", [
            'customer_id' => $newCustomer->id,
        ])->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.customer_id', $newCustomer->id)
            ->assertJsonPath('data.customer_name', 'Nuevo cliente')
            ->assertJsonPath('data.items.0.product_id', $product->id)
            ->assertJsonPath('data.items.0.description', $product->description)
            ->assertJsonPath('data.items.0.unit_price', '3.8000')
            ->assertJsonPath('data.internal_labor_enabled', true)
            ->assertJsonPath('data.internal_labor_total', '100.00');

        $cloneId = $clone->json('data.id');
        $payload['customer_id'] = $newCustomer->id;
        $payload['items'][0]['quantity'] = 5;
        $this->putJson("/api/quotations/{$cloneId}", $payload)
            ->assertOk()
            ->assertJsonPath('data.items.0.quantity', '5.000');

        $this->assertDatabaseHas('quotations', [
            'id' => $original['id'],
            'customer_id' => $originalCustomer->id,
            'status' => 'sent',
            'subtotal' => 107.6,
        ]);
        $this->assertDatabaseHas('quotation_items', [
            'quotation_id' => $original['id'],
            'quantity' => 2,
            'description' => $product->description,
        ]);
        $this->assertDatabaseHas('quotation_items', [
            'quotation_id' => $cloneId,
            'quantity' => 5,
            'description' => $product->description,
        ]);

        $inactiveCustomer = $this->createCustomer('Cliente inactivo');
        $inactiveCustomer->update(['active' => false]);
        $this->postJson("/api/quotations/{$original['id']}/clone", [
            'customer_id' => $inactiveCustomer->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['customer_id']);
    }

    private function createCustomer(string $name): Customer
    {
        return Customer::create([
            'name' => $name,
            'customer_type' => 'company',
            'identification' => (string) random_int(1000000000, 1999999999),
            'active' => true,
        ]);
    }

    private function createUserWithRole(string $slug): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(
            ['slug' => $slug],
            ['name' => ucfirst($slug), 'active' => true]
        );
        $user->roles()->syncWithoutDetaching([$role->id]);

        return $user;
    }

    private function quotationPayload(Customer $customer): array
    {
        return [
            'customer_id' => $customer->id,
            'title' => 'Instalación eléctrica',
            'issue_date' => now()->toDateString(),
            'valid_until' => now()->addDays(30)->toDateString(),
            'status' => 'draft',
            'discount_percent' => 0,
            'tax_percent' => 15,
            'items' => [[
                'category' => 'material',
                'description' => 'Cable',
                'unit' => 'm',
                'quantity' => 2,
                'unit_price' => 1,
            ]],
        ];
    }
}
