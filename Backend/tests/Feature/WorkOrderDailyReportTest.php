<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\DailyReport;
use App\Models\Project;
use App\Models\ProjectUpdatePhoto;
use App\Models\Quotation;
use App\Models\Role;
use App\Models\User;
use App\Models\WorkOrder;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WorkOrderDailyReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['admin', 'gerente', 'contabilidad', 'supervisor', 'tecnico', 'cliente'] as $slug) {
            Role::firstOrCreate(
                ['slug' => $slug],
                ['name' => ucfirst($slug), 'active' => true]
            );
        }
    }

    public function test_worker_creation_restores_a_missing_default_role(): void
    {
        $admin = $this->createUserWithRole('admin');
        $this->authenticateAs($admin);
        Role::where('slug', 'tecnico')->delete();

        $this->postJson('/api/workers', [
            'name' => 'Trabajador nuevo',
            'email' => 'nuevo.worker@example.test',
            'identification' => '0102030405',
        ])->assertCreated()
            ->assertJsonPath('data.role', 'tecnico');

        $this->assertDatabaseHas('roles', [
            'slug' => 'tecnico',
            'active' => true,
        ]);
    }

    public function test_admin_can_create_worker_and_assign_them_to_existing_work_order(): void
    {
        $admin = $this->createUserWithRole('admin');
        $this->authenticateAs($admin);

        $worker = $this->postJson('/api/workers', [
            'name' => 'Ana Técnica',
            'email' => 'ana.worker@example.test',
            'identification' => '0102030405',
            'phone' => '0991234567',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Ana Técnica')
            ->assertJsonPath('data.phone', '0991234567')
            ->assertJsonPath('data.identification', '0102030405')
            ->assertJsonMissingPath('data.password')
            ->json('data');

        $this->assertTrue(Hash::check('0102030405', User::findOrFail($worker['id'])->password));
        $workOrder = $this->createWorkOrder();

        $this->putJson("/api/work-orders/{$workOrder->id}", [
            'status' => 'in_progress',
            'description' => 'Instalación de luminarias y pruebas.',
            'worker_ids' => [$worker['id']],
        ])->assertOk()
            ->assertJsonPath('data.workers.0.name', 'Ana Técnica');

        $this->getJson('/api/work-orders?per_page=100')
            ->assertOk()
            ->assertJsonPath('per_page', 100)
            ->assertJsonPath('data.0.latest_reports', []);

        $this->authenticateAs(User::findOrFail($worker['id']));
        $this->getJson('/api/worker/work-orders')
            ->assertOk()
            ->assertJsonPath('data.0.number', $workOrder->number);
    }

    public function test_worker_can_submit_one_daily_report_for_assigned_order_with_server_timestamp(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 1)->setTime(14, 35, 10));
        $worker = $this->createUserWithRole('tecnico');
        $workOrder = $this->createWorkOrder();
        $workOrder->workers()->attach($worker->id);
        $this->authenticateAs($worker);

        $payload = [
            'work_order_id' => $workOrder->id,
            'report_date' => '2026-10-01',
            'work_done' => 'Instalación de tablero principal y prueba de continuidad.',
            'location' => 'Av. Central 123, Cuenca',
            'hours_worked' => 7.5,
            'start_time' => '08:00',
            'end_time' => '15:30',
            'materials_used' => 'Cable THHN, breakers y terminales.',
            'issues' => 'Sin novedades.',
            'notes' => 'Pruebas completadas.',
            'submitted_at' => '2000-01-01 00:00:00',
        ];

        $created = $this->postJson('/api/worker/daily-reports', $payload)
            ->assertCreated()
            ->assertJsonPath('data.worker.name', $worker->name)
            ->assertJsonPath('data.work_done', $payload['work_done']);

        $this->assertSame('2026-10-01T19:35:10', substr($created->json('data.submitted_at'), 0, 19));
        $this->assertDatabaseHas('daily_reports', [
            'worker_id' => $worker->id,
            'work_order_id' => $workOrder->id,
            'report_date' => '2026-10-01',
            'submitted_at' => '2026-10-01 14:35:10',
        ]);
        $this->postJson('/api/worker/daily-reports', $payload)->assertUnprocessable();
        $this->getJson('/api/worker/daily-reports?month=2026-10')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_worker_can_submit_report_for_ecuador_date_before_utc_midnight_rolls_over(): void
    {
        $this->travelTo(Carbon::parse('2026-10-02 01:30:00', 'UTC'));
        $this->assertSame('2026-10-01', now()->toDateString());

        $worker = $this->createUserWithRole('tecnico');
        $workOrder = $this->createWorkOrder();
        $workOrder->workers()->attach($worker->id);
        $this->authenticateAs($worker);

        $this->postJson('/api/worker/daily-reports', [
            'work_order_id' => $workOrder->id,
            'report_date' => '2026-10-01',
            'work_done' => 'Instalación de luminarias y pruebas eléctricas.',
            'location' => 'Cuenca',
        ])->assertCreated();
    }

    public function test_workers_cannot_report_for_unassigned_orders_or_past_dates_and_roles_are_restricted(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 1));
        $worker = $this->createUserWithRole('tecnico');
        $workOrder = $this->createWorkOrder();
        $this->authenticateAs($worker);

        $payload = [
            'work_order_id' => $workOrder->id,
            'report_date' => '2026-10-01',
            'work_done' => 'Pruebas eléctricas de los circuitos.',
            'location' => 'Obra',
        ];
        $this->postJson('/api/worker/daily-reports', $payload)->assertForbidden();

        $workOrder->workers()->attach($worker->id);
        $payload['report_date'] = '2026-09-30';
        $this->postJson('/api/worker/daily-reports', $payload)->assertUnprocessable();

        $accounting = $this->createUserWithRole('contabilidad');
        $this->authenticateAs($accounting);
        $this->getJson('/api/worker/daily-reports')->assertForbidden();
        $this->postJson('/api/worker/daily-reports', [])->assertForbidden();
    }

    public function test_daily_report_overdue_counts_each_elapsed_calendar_day_and_admin_can_export_monthly_worker_report(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(9, 0));
        $admin = $this->createUserWithRole('admin');
        $worker = $this->createUserWithRole('tecnico');
        $otherWorker = $this->createUserWithRole('tecnico');
        $workOrder = $this->createWorkOrder();
        $workOrder->workers()->attach([$worker->id, $otherWorker->id]);

        $this->authenticateAs($admin);
        $this->getJson('/api/daily-reports?month=2026-10')
            ->assertOk()
            ->assertJsonPath('summary.submitted', 0)
            ->assertJsonPath('summary.overdue', 6)
            ->assertJsonPath('summary.overdue_days.0.report_date', '2026-10-01')
            ->assertJsonPath('summary.overdue_days.0.worker_id', $worker->id)
            ->assertJsonPath('summary.overdue_days.0.work_order_id', $workOrder->id)
            ->assertJsonPath('summary.overdue_days.5.report_date', '2026-10-03');

        $this->getJson('/api/daily-reports/overview?month=2026-10')
            ->assertOk()
            ->assertJsonPath('summary.overdue', 6)
            ->assertJsonPath('summary.work_orders.0.submitted', 0);

        $this->getJson('/api/daily-reports?month=2026-10&worker_id='.$worker->id)
            ->assertOk()
            ->assertJsonPath('summary.overdue', 3);
        $this->getJson('/api/daily-reports/overview?month=2026-10&worker_id='.$worker->id)
            ->assertOk()
            ->assertJsonCount(1, 'summary.workers');

        $this->authenticateAs($worker);
        $this->postJson('/api/worker/daily-reports', [
            'work_order_id' => $workOrder->id,
            'report_date' => '2026-10-03',
            'work_done' => 'Se terminó instalación y pruebas de iluminación.',
            'location' => 'Edificio norte',
        ])->assertCreated();

        $this->authenticateAs($this->createUserWithRole('contabilidad'));
        $this->getJson('/api/daily-reports?month=2026-10&worker_id='.$worker->id)
            ->assertOk()
            ->assertJsonPath('data.0.worker.id', $worker->id)
            ->assertJsonPath('data.0.submitted_at', '2026-10-03T14:00:00.000000Z')
            ->assertJsonPath('summary.overdue', 2);
        $response = $this->get('/api/daily-reports/export?month=2026-10&worker_id='.$worker->id)
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
        ob_start();
        $response->baseResponse->sendContent();
        $csv = ob_get_clean();
        $this->assertSame(
            ['Fecha', 'Orden de trabajo', 'Trabajador'],
            array_slice(str_getcsv(strtok($csv, "\n")), 0, 3)
        );
        $this->assertStringContainsString($workOrder->number, $csv);

        $workOrder->update(['status' => 'completed']);
        $this->getJson('/api/daily-reports?month=2026-10&worker_id='.$worker->id)
            ->assertOk()
            ->assertJsonPath('summary.overdue', 0);
    }

    public function test_monthly_payroll_counts_unique_report_dates_and_uses_worker_daily_rate(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(12, 0));
        $admin = $this->createUserWithRole('admin');
        $this->authenticateAs($admin);
        $worker = $this->postJson('/api/workers', [
            'name' => 'Trabajador con tarifa',
            'email' => 'tarifa.worker@example.test',
            'identification' => '0912345678',
            'daily_rate' => 100,
        ])->assertCreated()
            ->assertJsonPath('data.daily_rate', '100.00')
            ->json('data');
        $workOrderOne = $this->createWorkOrder();
        $workOrderTwo = $this->createWorkOrder();
        $workerModel = User::findOrFail($worker['id']);
        $workOrderOne->workers()->attach($workerModel->id);
        $workOrderTwo->workers()->attach($workerModel->id);

        foreach ([
            [$workOrderOne, '2026-10-01'],
            [$workOrderTwo, '2026-10-01'],
            [$workOrderOne, '2026-10-02'],
            [$workOrderTwo, '2026-10-03'],
        ] as [$workOrder, $date]) {
            DailyReport::create([
                'work_order_id' => $workOrder->id,
                'worker_id' => $workerModel->id,
                'report_date' => $date,
                'work_done' => 'Trabajo eléctrico completado.',
                'location' => 'Cuenca',
                'submitted_at' => now(),
            ]);
        }

        $this->authenticateAs($admin);
        $this->getJson('/api/daily-reports?month=2026-10&work_order_id='.$workOrderOne->id)
            ->assertOk()
            ->assertJsonPath('summary.payroll.workers.0.worked_days', 3)
            ->assertJsonPath('summary.payroll.workers.0.daily_rate', 100)
            ->assertJsonPath('summary.payroll.workers.0.amount_due', 300)
            ->assertJsonPath('summary.payroll.total_due', 300);

        $this->postJson('/api/worker-payroll-payments', [
            'worker_id' => $workerModel->id,
            'month' => '2026-10',
            'amount' => 250,
            'payment_date' => '2026-10-03',
            'notes' => 'Abono en efectivo',
        ])->assertCreated()
            ->assertJsonPath('data.amount', '250.00')
            ->assertJsonPath('data.creator.id', $admin->id);

        $this->putJson("/api/workers/{$workerModel->id}/daily-rate", ['daily_rate' => 200])
            ->assertOk();
        $this->getJson('/api/daily-reports?month=2026-10&worker_id='.$workerModel->id)
            ->assertOk()
            ->assertJsonPath('summary.payroll.workers.0.daily_rate', 100)
            ->assertJsonPath('summary.payroll.workers.0.paid', 250)
            ->assertJsonPath('summary.payroll.workers.0.balance', 50)
            ->assertJsonPath('summary.payroll.workers.0.status', 'partial')
            ->assertJsonPath('summary.payroll.workers.0.payments.0.notes', 'Abono en efectivo');
        $this->postJson('/api/worker-payroll-payments', [
            'worker_id' => $workerModel->id,
            'month' => '2026-10',
            'amount' => 50,
        ])->assertCreated();
        $this->getJson('/api/daily-reports?month=2026-10&worker_id='.$workerModel->id)
            ->assertOk()
            ->assertJsonPath('summary.payroll.workers.0.status', 'paid')
            ->assertJsonPath('summary.payroll.workers.0.balance', 0)
            ->assertJsonPath('summary.payroll.total_paid', 300);
        $this->postJson('/api/worker-payroll-payments', [
            'worker_id' => $workerModel->id,
            'month' => '2026-10',
            'amount' => 0.01,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('amount');
    }

    public function test_reporting_and_work_order_views_are_private_to_allowed_roles(): void
    {
        $this->getJson('/api/work-orders')->assertUnauthorized();
        $this->authenticateAs($this->createUserWithRole('cliente'));
        $this->getJson('/api/work-orders')->assertForbidden();
        $this->getJson('/api/daily-reports')->assertForbidden();
        $this->postJson('/api/workers', [])->assertForbidden();
    }

    public function test_accounting_can_read_worker_reports_and_orders_but_cannot_manage_them(): void
    {
        $accounting = $this->createUserWithRole('contabilidad');
        $worker = $this->createUserWithRole('tecnico');
        $workOrder = $this->createWorkOrder();
        $workOrder->workers()->attach($worker->id);
        $this->authenticateAs($accounting);

        $this->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.work_orders', 1);
        $this->getJson('/api/workers')
            ->assertOk()
            ->assertJsonCount(1, 'data');
        $this->putJson("/api/workers/{$worker->id}/daily-rate", ['daily_rate' => 80])
            ->assertOk()
            ->assertJsonPath('data.daily_rate', '80.00');
        $this->getJson('/api/work-orders?page=1&search=')
            ->assertOk()
            ->assertJsonPath('data.0.number', $workOrder->number);
        $this->getJson("/api/work-orders/{$workOrder->id}")
            ->assertOk()
            ->assertJsonPath('data.number', $workOrder->number)
            ->assertJsonPath('data.project.quotation.total', '115.00')
            ->assertJsonPath('data.latest_reports', []);
        $this->putJson("/api/work-orders/{$workOrder->id}", ['status' => 'completed'])
            ->assertForbidden();
        $this->postJson('/api/workers', [
            'name' => 'No autorizado',
            'email' => 'not-authorized@example.test',
            'password' => 'Seguro12345',
        ])->assertForbidden();
    }

    public function test_project_leader_can_be_assigned_publish_photo_updates_and_report_workdays(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 1)->setTime(14, 0));
        Storage::fake('local');
        $admin = $this->createUserWithRole('admin');
        $this->authenticateAs($admin);
        $leader = $this->postJson('/api/workers', [
            'name' => 'Líder de prueba',
            'email' => 'leader@example.test',
            'identification' => '0102030406',
            'role' => 'lider_proyecto',
        ])->assertCreated()
            ->assertJsonPath('data.role', 'lider_proyecto')
            ->json('data');
        $workOrder = $this->createWorkOrder();

        $this->putJson("/api/work-orders/{$workOrder->id}", [
            'status' => 'in_progress',
            'worker_ids' => [],
            'leader_ids' => [$leader['id']],
        ])->assertOk()
            ->assertJsonPath('data.leaders.0.id', $leader['id']);

        $this->authenticateAs(User::findOrFail($leader['id']));
        $this->getJson('/api/worker/work-orders')
            ->assertOk()
            ->assertJsonPath('data.0.project.id', $workOrder->project_id);
        $this->postJson('/api/worker/daily-reports', [
            'work_order_id' => $workOrder->id,
            'report_date' => '2026-10-01',
            'work_done' => 'Coordinación del equipo y revisión de la instalación.',
            'location' => 'Proyecto de prueba',
        ])->assertCreated();

        $update = $this->post('/api/worker/projects/'.$workOrder->project_id.'/updates', [
            'title' => 'Avance de instalación',
            'description' => 'Se instalaron los tableros principales.',
            'progress' => 35,
            'visible_to_customer' => '1',
            'photos' => [UploadedFile::fake()->image('avance.jpg', 32, 32)],
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Avance de instalación')
            ->assertJsonPath('data.photos.0.original_name', 'avance.jpg')
            ->json('data');

        $photoPath = ProjectUpdatePhoto::where('project_update_id', $update['id'])->value('path');
        $this->assertNotNull($photoPath);
        Storage::disk('local')->assertExists($photoPath);
        $this->getJson('/api/worker/project-update-photos/'.ProjectUpdatePhoto::where('project_update_id', $update['id'])->value('id'))
            ->assertOk();

        $this->postJson('/api/worker/projects/'.$workOrder->project_id.'/updates', [
            'title' => 'Registro de trabajo',
            'description' => 'Continúa la instalación sin variar el porcentaje.',
            'progress' => 35,
        ])->assertCreated()
            ->assertJsonPath('data.progress', null);

        $this->postJson('/api/worker/projects/'.$workOrder->project_id.'/updates', [
            'title' => 'Avance retrocedido',
            'description' => 'No debe poder publicarse.',
            'progress' => 30,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('progress');

        $customer = $this->createUserWithRole('cliente');
        $customer->update(['customer_id' => $workOrder->project->customer_id]);
        $this->authenticateAs($customer);
        $this->getJson('/api/worker/project-update-photos/'.ProjectUpdatePhoto::where('project_update_id', $update['id'])->value('id'))
            ->assertOk();
        $this->assertDatabaseHas('projects', ['id' => $workOrder->project_id, 'progress' => 35]);
        $this->assertDatabaseCount('project_updates', 2);
    }

    public function test_worker_identification_is_required_unique_and_used_as_password(): void
    {
        $this->authenticateAs($this->createUserWithRole('admin'));
        $payload = [
            'name' => 'Bruno Técnico',
            'email' => 'bruno.worker@example.test',
            'identification' => '0912345678',
        ];

        $created = $this->postJson('/api/workers', $payload)
            ->assertCreated()
            ->assertJsonPath('data.identification', '0912345678')
            ->json('data');
        $worker = User::findOrFail($created['id']);
        $this->assertTrue(Hash::check('0912345678', $worker->password));

        $this->postJson('/api/workers', [
            ...$payload,
            'email' => 'duplicate.worker@example.test',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('identification');

        $this->putJson("/api/workers/{$worker->id}", [
            'identification' => '0923456789',
        ])->assertOk()
            ->assertJsonPath('data.identification', '0923456789');
        $this->assertTrue(Hash::check('0923456789', $worker->fresh()->password));
    }

    private function createUserWithRole(string $slug): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('slug', $slug)->value('id'));

        return $user;
    }

    private function authenticateAs(User $user): void
    {
        $this->flushSession();
        Auth::forgetGuards();
        $this->actingAs($user, 'web');
    }

    private function createWorkOrder(): WorkOrder
    {
        $customer = Customer::create([
            'name' => 'Cliente de prueba',
            'identification' => (string) random_int(10000000, 99999999),
            'active' => true,
        ]);
        $quotation = Quotation::create([
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_identification' => $customer->identification,
            'title' => 'Instalación eléctrica',
            'issue_date' => '2026-10-01',
            'valid_until' => '2026-11-01',
            'status' => 'accepted',
            'currency' => 'USD',
            'subtotal' => 100,
            'discount_percent' => 0,
            'discount_amount' => 0,
            'tax_percent' => 15,
            'tax_amount' => 15,
            'total' => 115,
        ]);
        $project = Project::create([
            'quotation_id' => $quotation->id,
            'customer_id' => $customer->id,
            'title' => $quotation->title,
            'status' => 'in_progress',
            'progress' => 0,
        ]);

        return WorkOrder::create([
            'number' => 'OT-2026-'.str_pad((string) $project->id, 5, '0', STR_PAD_LEFT),
            'project_id' => $project->id,
            'status' => 'pending',
            'description' => 'Instalación y pruebas.',
        ]);
    }
}
