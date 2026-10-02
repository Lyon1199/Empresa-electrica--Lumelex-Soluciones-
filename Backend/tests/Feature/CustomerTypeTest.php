<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Role;
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
