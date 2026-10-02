<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\MailSetting;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use App\Mail\QuotationSent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class QuotationTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_an_electrical_quotation_and_calculates_totals(): void
    {
        $this->actingAs($this->createStaff());
        $customer = $this->createCustomer();

        $response = $this->postJson('/api/quotations', $this->quotationPayload($customer));

        $response->assertCreated()
            ->assertJsonPath('data.number', 'COT-'.now()->format('Y').'-00001')
            ->assertJsonPath('data.customer_name', 'Cliente de prueba')
            ->assertJsonPath('data.subtotal', '200.00')
            ->assertJsonPath('data.discount_amount', '20.00')
            ->assertJsonPath('data.tax_amount', '27.00')
            ->assertJsonPath('data.total', '207.00')
            ->assertJsonPath('data.items.0.line_total', '200.00')
            ->assertJsonPath('data.items.0.unit', 'm');

        $this->assertDatabaseHas('quotations', [
            'customer_id' => $customer->id,
            'status' => 'draft',
            'total' => 207,
        ]);

        $this->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.quotations', 1)
            ->assertJsonPath('data.open_quotations', 1)
            ->assertJsonPath('data.open_quotation_value', 207);
    }

    public function test_quotations_can_be_searched_filtered_updated_and_deleted(): void
    {
        $this->actingAs($this->createStaff());
        $customer = $this->createCustomer();
        $payload = $this->quotationPayload($customer);
        $quotation = $this->postJson('/api/quotations', $payload)
            ->assertCreated()
            ->json('data');

        $this->getJson('/api/quotations?search=COT-')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/quotations?status=accepted')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $payload['status'] = 'accepted';
        $payload['items'][0]['quantity'] = 3;

        $accepted = $this->putJson('/api/quotations/'.$quotation['id'], $payload)
            ->assertOk()
            ->assertJsonPath('data.status', 'accepted')
            ->assertJsonPath('data.subtotal', '300.00')
            ->assertJsonPath('data.total', '310.50')
            ->assertJsonPath('project.status', 'planning')
            ->assertJsonPath('portal_credentials.password', '1799999999001');

        $credentials = $accepted->json('portal_credentials');
        $customerUser = User::where('email', $credentials['email'])->firstOrFail();
        $this->assertTrue($customerUser->must_change_password);
        $this->assertSame($customer->id, $customerUser->customer_id);
        $this->assertTrue(Hash::check('1799999999001', $customerUser->password));
        $this->assertTrue($customerUser->hasRole('cliente'));
        $this->assertDatabaseHas('projects', [
            'quotation_id' => $quotation['id'],
            'customer_id' => $customer->id,
            'progress' => 0,
        ]);
        $this->assertDatabaseHas('work_orders', [
            'project_id' => $this->firstProjectId(),
            'number' => 'OT-'.now()->format('Y').'-00001',
            'status' => 'pending',
        ]);
        $this->getJson('/api/projects')
            ->assertOk()
            ->assertJsonPath('data.0.work_order.number', 'OT-'.now()->format('Y').'-00001');

        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/login', [
                'email' => $credentials['email'],
                'password' => '1799999999001',
            ])->assertOk()
            ->assertJsonPath('user.must_change_password', true)
            ->assertJsonPath('user.roles.0', 'cliente');

        $this->actingAs($customerUser)
            ->getJson('/api/customer/projects')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.customer_id', $customer->id);

        $this->putJson('/api/customer/password', [
            'current_password' => '1799999999001',
            'password' => 'PortalAcceso2026',
            'password_confirmation' => 'PortalAcceso2026',
        ])->assertOk();

        $this->getJson('/api/customer/projects')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.number', 'PRO-'.now()->format('Y').'-00001')
            ->assertJsonPath('data.0.work_order.number', 'OT-'.now()->format('Y').'-00001');

        Storage::fake('local');
        $receiptResponse = $this->postJson(
            '/api/customer/projects/'.$this->firstProjectId().'/deposit-receipts',
            [
                'receipt' => UploadedFile::fake()->createWithContent(
                    'deposit.pdf',
                    "%PDF-1.4\nTest deposit receipt\n%%EOF"
                ),
                'amount' => '50',
                'notes' => 'Depósito de anticipo',
            ]
        )->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.amount', '50.00');

        $receiptId = $receiptResponse->json('data.id');
        $accounting = $this->createUserWithRole('contabilidad', 'Contabilidad');
        $this->flushSession();
        Auth::forgetGuards();
        $this->actingAs($accounting, 'web');

        $this->getJson('/api/deposit-receipts')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->get('/api/deposit-receipts/'.$receiptId.'/download')
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->putJson('/api/deposit-receipts/'.$receiptId.'/review', [
            'status' => 'approved',
            'review_notes' => 'Comprobante recibido.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $staff = $this->createStaff();
        $this->flushSession();
        Auth::forgetGuards();
        $this->actingAs($staff, 'web');

        $this->putJson('/api/quotations/'.$quotation['id'], $payload)
            ->assertOk()
            ->assertJsonPath('portal_credentials', null);

        $this->assertDatabaseCount('projects', 1);
        $this->assertDatabaseCount('users', 4);

        $this->deleteJson('/api/quotations/'.$quotation['id'])
            ->assertUnprocessable();
    }

    public function test_internal_labor_is_saved_and_included_in_quote_totals_but_hidden_from_list(): void
    {
        $this->actingAs($this->createStaff(), 'web');
        $customer = $this->createCustomer();
        $payload = $this->quotationPayload($customer);
        $payload['internal_labor_enabled'] = true;
        $payload['internal_worker_count'] = 2;
        $payload['internal_work_days'] = 3;
        $payload['internal_daily_rate'] = 40;

        $quotation = $this->postJson('/api/quotations', $payload)
            ->assertCreated()
            ->assertJsonPath('data.subtotal', '440.00')
            ->assertJsonPath('data.discount_amount', '44.00')
            ->assertJsonPath('data.tax_amount', '59.40')
            ->assertJsonPath('data.total', '455.40')
            ->assertJsonPath('data.internal_labor_enabled', true)
            ->assertJsonPath('data.internal_worker_count', 2)
            ->assertJsonPath('data.internal_work_days', '3.00')
            ->assertJsonPath('data.internal_daily_rate', '40.00')
            ->assertJsonPath('data.internal_labor_total', '240.00')
            ->json('data');

        $listed = $this->getJson('/api/quotations')
            ->assertOk()
            ->json('data.0');
        $this->assertArrayNotHasKey('internal_labor_enabled', $listed);
        $this->assertArrayNotHasKey('internal_daily_rate', $listed);

        $this->getJson('/api/quotations/'.$quotation['id'])
            ->assertOk()
            ->assertJsonPath('data.internal_daily_rate', '40.00');

        $this->assertDatabaseHas('quotations', [
            'id' => $quotation['id'],
            'internal_labor_enabled' => true,
            'internal_worker_count' => 2,
            'internal_labor_total' => 240,
            'subtotal' => 440,
        ]);
    }

    public function test_marking_a_draft_quotation_as_sent_emails_the_pdf_to_the_customer(): void
    {
        Mail::fake();
        $this->actingAs($this->createStaff());
        $customer = $this->createCustomer();
        $customer->update(['email' => 'cliente@example.test']);
        MailSetting::forceCreate([
            'id' => 1,
            'host' => 'smtp.example.test',
            'port' => 587,
            'scheme' => 'smtp',
            'username' => 'mailer@example.test',
            'from_address' => 'quotes@example.test',
            'from_name' => 'Lumelex',
        ]);
        $quotation = $this->postJson('/api/quotations', $this->quotationPayload($customer))
            ->assertCreated()
            ->json('data');
        $sentPayload = $this->quotationPayload($customer);
        $sentPayload['status'] = 'sent';
        $this->putJson('/api/quotations/'.$quotation['id'], $sentPayload)
            ->assertUnprocessable();

        $this->post('/api/quotations/'.$quotation['id'].'/send', [
            'pdf' => UploadedFile::fake()->createWithContent(
                'cotizacion.pdf',
                "%PDF-1.4\nCotización de prueba\n%%EOF"
            ),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.status', 'sent')
            ->assertJsonPath('data.customer_email', 'cliente@example.test');

        $this->assertNotNull(\App\Models\Quotation::findOrFail($quotation['id'])->sent_at);
        Mail::assertSent(QuotationSent::class, fn (QuotationSent $mail) =>
            $mail->hasTo('cliente@example.test')
            && $mail->quotation->id === $quotation['id']
        );
    }

    public function test_microsoft_mail_sends_quotation_html_and_pdf_through_graph(): void
    {
        $this->actingAs($this->createStaff());
        $customer = $this->createCustomer();
        $customer->update(['email' => 'cliente@example.test']);
        MailSetting::forceCreate([
            'id' => 1,
            'provider' => 'microsoft',
            'host' => 'smtp-mail.outlook.com',
            'port' => 587,
            'scheme' => 'smtp',
            'username' => 'lumelex@hotmail.com',
            'microsoft_account_id' => 'microsoft-account-id',
            'microsoft_email' => 'lumelex@hotmail.com',
            'encrypted_access_token' => Crypt::encryptString('valid-access-token'),
            'encrypted_refresh_token' => Crypt::encryptString('valid-refresh-token'),
            'microsoft_token_expires_at' => now()->addHour(),
            'from_address' => 'lumelex@hotmail.com',
            'from_name' => 'Lumelex',
        ]);
        $quotation = $this->postJson('/api/quotations', $this->quotationPayload($customer))
            ->assertCreated()
            ->json('data');
        $pdfContent = "%PDF-1.4\nCotización Microsoft\n%%EOF";
        Http::fake([
            'https://graph.microsoft.com/v1.0/me/sendMail' => Http::response([], 202),
        ]);

        $this->post('/api/quotations/'.$quotation['id'].'/send', [
            'pdf' => UploadedFile::fake()->createWithContent('cotizacion.pdf', $pdfContent),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.status', 'sent');

        Http::assertSent(fn ($request) => $request->url() === 'https://graph.microsoft.com/v1.0/me/sendMail'
            && $request['message']['toRecipients'][0]['emailAddress']['address'] === 'cliente@example.test'
            && $request['message']['attachments'][0]['contentBytes'] === base64_encode($pdfContent));
    }

    public function test_quotation_cannot_be_marked_sent_without_a_customer_email_or_mail_configuration(): void
    {
        $this->actingAs($this->createStaff());
        $customer = $this->createCustomer();
        $customer->update(['email' => 'cliente@example.test']);
        $quotation = $this->postJson('/api/quotations', $this->quotationPayload($customer))
            ->assertCreated()
            ->json('data');
        $pdf = UploadedFile::fake()->createWithContent('cotizacion.pdf', "%PDF-1.4\nTest\n%%EOF");

        config(['mail.default' => 'smtp']);
        \App\Models\Quotation::whereKey($quotation['id'])->update(['customer_email' => null]);
        $this->post('/api/quotations/'.$quotation['id'].'/send', ['pdf' => $pdf], ['Accept' => 'application/json'])
            ->assertUnprocessable();
        $this->assertDatabaseHas('quotations', ['id' => $quotation['id'], 'status' => 'draft']);

        \App\Models\Quotation::whereKey($quotation['id'])->update(['customer_email' => $customer->email]);
        config(['mail.default' => 'log']);
        $this->post('/api/quotations/'.$quotation['id'].'/send', ['pdf' => $pdf], ['Accept' => 'application/json'])
            ->assertServiceUnavailable();
        $this->assertDatabaseHas('quotations', ['id' => $quotation['id'], 'status' => 'draft']);
    }

    public function test_quotation_requires_a_customer_and_at_least_one_valid_item(): void
    {
        $this->actingAs($this->createStaff());

        $this->postJson('/api/quotations', [
            'customer_id' => 999,
            'title' => 'Instalación eléctrica',
            'issue_date' => now()->toDateString(),
            'valid_until' => now()->addDays(30)->toDateString(),
            'status' => 'draft',
            'discount_percent' => 0,
            'tax_percent' => 15,
            'items' => [],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['customer_id', 'items']);
    }

    private function createCustomer(): Customer
    {
        Role::firstOrCreate(
            ['slug' => 'cliente'],
            ['name' => 'Cliente', 'active' => true]
        );

        return Customer::create([
            'name' => 'Cliente de prueba',
            'customer_type' => 'company',
            'identification' => '1799999999001',
            'active' => true,
        ]);
    }

    private function createStaff(): User
    {
        return $this->createUserWithRole('admin', 'Administrador');
    }

    private function createUserWithRole(string $slug, string $name): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(
            ['slug' => $slug],
            ['name' => $name, 'active' => true]
        );
        $user->roles()->syncWithoutDetaching([$role->id]);

        return $user;
    }

    private function firstProjectId(): int
    {
        return (int) Project::query()->value('id');
    }

    private function quotationPayload(Customer $customer): array
    {
        return [
            'customer_id' => $customer->id,
            'title' => 'Instalación eléctrica residencial',
            'issue_date' => now()->toDateString(),
            'valid_until' => now()->addDays(30)->toDateString(),
            'status' => 'draft',
            'scope' => 'Suministro e instalación de tablero eléctrico.',
            'notes' => '',
            'terms' => '50% de anticipo y saldo contra entrega.',
            'discount_percent' => 10,
            'tax_percent' => 15,
            'items' => [
                [
                    'category' => 'material',
                    'description' => 'Cable de cobre calibre 12',
                    'unit' => 'm',
                    'quantity' => 2,
                    'unit_price' => 100,
                ],
            ],
        ];
    }
}
