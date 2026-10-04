<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_filter_users_by_category_and_role(): void
    {
        $this->actingAs($this->createUserWithRole('admin'));
        $technician = $this->createUserWithRole('tecnico');
        $this->createUserWithRole('cliente');

        $this->getJson('/api/admin/users?category=workers&role=tecnico')
            ->assertOk()
            ->assertJsonPath('pagination.total', 1)
            ->assertJsonPath('data.0.id', $technician->id)
            ->assertJsonPath('data.0.roles.0.slug', 'tecnico');
    }

    public function test_admin_can_promote_a_technician_to_project_leader(): void
    {
        $this->actingAs($this->createUserWithRole('admin'));
        $technician = $this->createUserWithRole('tecnico');

        $this->putJson("/api/admin/users/{$technician->id}/role", [
            'role' => 'lider_proyecto',
        ])->assertOk()
            ->assertJsonPath('data.role', 'lider_proyecto');

        $this->assertSame(
            ['lider_proyecto'],
            $technician->fresh()->roles()->pluck('slug')->all()
        );
    }

    public function test_admin_can_create_staff_accounts_that_can_sign_in(): void
    {
        $this->actingAs($this->createUserWithRole('admin'));

        foreach (['bodega', 'contabilidad'] as $roleSlug) {
            $email = "{$roleSlug}@example.test";
            $this->postJson('/api/admin/users', [
                'name' => ucfirst($roleSlug),
                'email' => $email,
                'password' => 'SecurePass123',
                'role' => $roleSlug,
            ])->assertCreated()
                ->assertJsonPath('data.role', $roleSlug);

            $user = User::where('email', $email)->firstOrFail();
            $this->assertTrue(Hash::check('SecurePass123', $user->password));
            $this->assertTrue($user->hasRole($roleSlug));
        }
    }

    public function test_staff_account_creation_rejects_weak_passwords_and_non_staff_roles(): void
    {
        $this->actingAs($this->createUserWithRole('admin'));

        $payload = [
            'name' => 'Bodega',
            'email' => 'bodega@example.test',
            'password' => 'short',
            'role' => 'bodega',
        ];

        $this->postJson('/api/admin/users', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->postJson('/api/admin/users', [
            ...$payload,
            'email' => 'admin-role@example.test',
            'password' => 'SecurePass123',
            'role' => 'admin',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('role');
    }

    public function test_customer_user_shows_the_phone_saved_on_the_customer_record(): void
    {
        $this->actingAs($this->createUserWithRole('admin'));
        $customer = Customer::create([
            'name' => 'Cliente de prueba',
            'identification' => '1234567890',
            'phone' => '0991234567',
            'contact_phone' => '0987654321',
        ]);
        $portalUser = User::factory()->create([
            'customer_id' => $customer->id,
            'phone' => null,
        ]);
        $role = Role::firstOrCreate(
            ['slug' => 'cliente'],
            ['name' => 'Cliente', 'active' => true]
        );
        $portalUser->roles()->attach($role->id);

        $this->getJson('/api/admin/users?category=customers')
            ->assertOk()
            ->assertJsonPath('data.0.phone', '0991234567')
            ->assertJsonPath('data.0.customer.phone', '0991234567');
    }

    public function test_only_admins_can_list_and_change_user_roles(): void
    {
        $manager = $this->createUserWithRole('gerente');
        $technician = $this->createUserWithRole('tecnico');
        $this->actingAs($manager);

        $this->getJson('/api/admin/users')->assertForbidden();
        $this->putJson("/api/admin/users/{$technician->id}/role", [
            'role' => 'lider_proyecto',
        ])->assertForbidden();
    }

    public function test_admin_cannot_change_their_own_role(): void
    {
        $admin = $this->createUserWithRole('admin');
        $this->actingAs($admin);

        $this->putJson("/api/admin/users/{$admin->id}/role", [
            'role' => 'tecnico',
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'No puedes cambiar tu propio rol desde esta pantalla.');
    }

    public function test_login_rejects_overlong_email_before_email_parsing(): void
    {
        $this->postJson('/api/login', [
            'email' => str_repeat('a', 10000),
            'password' => 'password',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_frontend_development_origin_is_allowed_by_cors(): void
    {
        $this->withHeader('Origin', 'http://localhost:5173')
            ->getJson('/api/health')
            ->assertOk()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    }

    private function createUserWithRole(string $slug): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(
            ['slug' => $slug],
            ['name' => ucfirst($slug), 'active' => true]
        );
        $user->roles()->sync([$role->id]);

        return $user;
    }
}
