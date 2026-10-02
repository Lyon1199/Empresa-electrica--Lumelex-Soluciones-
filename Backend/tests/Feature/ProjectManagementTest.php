<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Project;
use App\Models\ProjectMaterial;
use App\Models\Quotation;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_project_materials_can_be_listed_created_updated_and_deleted_with_cost_totals(): void
    {
        $admin = $this->createUserWithRole('admin');
        $project = $this->createProject();
        $otherProject = $this->createProject();
        $this->actingAs($admin);

        $material = $this->postJson("/api/projects/{$project->id}/materials", [
            'name' => 'Cable THHN',
            'quantity' => 12.5,
            'unit' => 'metros',
            'unit_cost' => 1.2,
            'notes' => 'Calibre 12',
        ])->assertCreated()
            ->assertJsonPath('data.total_cost', 15)
            ->json('data');

        $secondMaterial = $this->postJson("/api/projects/{$project->id}/materials", [
            'name' => 'Tubería',
            'quantity' => 2,
            'unit' => 'unidades',
            'unit_cost' => 3.5,
        ])->assertCreated()->json('data');

        $this->getJson("/api/projects/{$project->id}/materials")
            ->assertOk()
            ->assertJsonPath('total_cost', 22)
            ->assertJsonCount(2, 'data');

        $this->putJson("/api/projects/{$project->id}/materials/{$material['id']}", [
            'name' => 'Cable THHN',
            'quantity' => 10,
            'unit' => 'metros',
            'unit_cost' => 1.5,
            'notes' => 'Calibre 10',
        ])->assertOk()
            ->assertJsonPath('data.total_cost', 15)
            ->assertJsonPath('data.notes', 'Calibre 10');

        $this->putJson("/api/projects/{$otherProject->id}/materials/{$material['id']}", [
            'name' => 'Cable THHN',
            'quantity' => 10,
            'unit' => 'metros',
            'unit_cost' => 1.5,
        ])->assertNotFound();

        $this->deleteJson("/api/projects/{$project->id}/materials/{$secondMaterial['id']}")
            ->assertOk();
        $this->assertDatabaseMissing('project_materials', ['id' => $secondMaterial['id']]);
    }

    public function test_project_progress_is_monotonic_and_equal_percentage_is_not_duplicated(): void
    {
        $admin = $this->createUserWithRole('admin');
        $project = $this->createProject();
        $this->actingAs($admin);

        $this->publishProjectUpdate($project, 25)->assertOk();
        $this->publishProjectUpdate($project, 25)
            ->assertOk()
            ->assertJsonPath('data.updates.0.progress', null);

        $this->publishProjectUpdate($project, 20)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('progress');

        $this->publishProjectUpdate($project, 40)->assertOk();

        $this->assertSame(40, $project->fresh()->progress);
        $this->assertSame(
            [40, null, 25],
            $project->updates()->get()->pluck('progress')->all()
        );
    }

    public function test_closed_projects_cannot_have_materials_changed(): void
    {
        $admin = $this->createUserWithRole('admin');
        $project = $this->createProject();
        $project->update(['status' => 'completed']);
        $this->actingAs($admin);

        $this->postJson("/api/projects/{$project->id}/materials", [
            'name' => 'Material cerrado',
            'quantity' => 1,
            'unit' => 'unidad',
            'unit_cost' => 10,
        ])->assertUnprocessable();
    }

    private function publishProjectUpdate(Project $project, int $progress)
    {
        return $this->putJson("/api/projects/{$project->id}", [
            'status' => 'in_progress',
            'progress' => $progress,
            'starts_at' => null,
            'target_date' => null,
            'update_title' => 'Avance de prueba',
            'update_description' => 'Detalle del trabajo realizado.',
        ]);
    }

    private function createProject(): Project
    {
        $customer = Customer::create([
            'name' => 'Cliente de prueba',
            'identification' => (string) random_int(1000000000, 9999999999),
        ]);
        $quotation = Quotation::create([
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_identification' => $customer->identification,
            'title' => 'Proyecto eléctrico de prueba',
            'issue_date' => now()->toDateString(),
            'valid_until' => now()->addMonth()->toDateString(),
            'status' => 'accepted',
            'currency' => 'USD',
            'subtotal' => 100,
            'discount_percent' => 0,
            'discount_amount' => 0,
            'tax_percent' => 15,
            'tax_amount' => 15,
            'total' => 115,
        ]);

        return Project::create([
            'quotation_id' => $quotation->id,
            'customer_id' => $customer->id,
            'title' => $quotation->title,
            'status' => 'in_progress',
            'progress' => 0,
        ]);
    }

    private function createUserWithRole(string $slug): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(
            ['slug' => $slug],
            ['name' => ucfirst($slug), 'active' => true]
        );
        $user->roles()->attach($role->id);

        return $user;
    }
}
