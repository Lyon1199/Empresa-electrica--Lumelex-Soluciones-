<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerTypeTest extends TestCase
{
    use RefreshDatabase;

    public function test_customers_can_be_created_and_filtered_by_type(): void
    {
        $this->actingAs($this->createStaff());

        $this->postJson('/api/customers', [
            'name' => 'Ana Pérez',
            'customer_type' => 'person',
            'identification' => '0101010101',
        ])->assertCreated()
            ->assertJsonPath('data.customer_type', 'person');

        $this->postJson('/api/customers', [
            'name' => 'Lumelex S.A.',
            'customer_type' => 'company',
            'identification' => '0190000000001',
        ])->assertCreated()
            ->assertJsonPath('data.customer_type', 'company');

        $this->getJson('/api/customers?customer_type=company')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.customer_type', 'company');
    }

    public function test_customer_type_must_be_valid_when_creating_a_customer(): void
    {
        $this->actingAs($this->createStaff());

        $this->postJson('/api/customers', [
            'name' => 'Cliente inválido',
            'customer_type' => 'other',
            'identification' => '1234567890',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('customer_type');
    }

    public function test_customer_phone_numbers_must_contain_exactly_ten_digits(): void
    {
        $this->actingAs($this->createStaff());

        $this->postJson('/api/customers', [
            'name' => 'Cliente con teléfono inválido',
            'customer_type' => 'person',
            'identification' => '0202020202',
            'phone' => '098123456',
            'contact_phone' => '09812345678',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['phone', 'contact_phone']);

        $this->postJson('/api/customers', [
            'name' => 'Cliente con teléfono válido',
            'customer_type' => 'person',
            'identification' => '0303030303',
            'phone' => '0981234567',
            'contact_phone' => '0991234567',
        ])->assertCreated();
    }

    public function test_customer_phone_numbers_are_validated_when_updated(): void
    {
        $this->actingAs($this->createStaff());
        $customer = Customer::create([
            'name' => 'Cliente para editar',
            'customer_type' => 'person',
            'identification' => '0404040404',
        ]);

        $this->putJson('/api/customers/'.$customer->id, [
            'name' => 'Cliente para editar',
            'customer_type' => 'person',
            'identification' => '0404040404',
            'phone' => '123',
            'contact_phone' => '123',
            'active' => true,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['phone', 'contact_phone']);
    }

    private function createStaff(): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Administrador', 'active' => true]
        );
        $user->roles()->syncWithoutDetaching([$role->id]);

        return $user;
    }
}
