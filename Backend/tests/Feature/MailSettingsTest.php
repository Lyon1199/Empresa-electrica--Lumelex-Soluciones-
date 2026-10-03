<?php

namespace Tests\Feature;

use App\Models\MailSetting;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class MailSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_save_mail_settings_without_exposing_the_encrypted_password(): void
    {
        $this->actingAs($this->createUserWithRole('admin'));

        $this->getJson('/api/admin/mail-settings')
            ->assertOk()
            ->assertJsonPath('data.configured', false);

        $this->putJson('/api/admin/mail-settings', [
            'host' => 'smtp.example.test',
            'port' => 587,
            'scheme' => 'smtp',
            'username' => 'mailer@example.test',
            'password' => 'smtp-application-secret',
            'from_address' => 'quotes@example.test',
            'from_name' => 'Lumelex',
        ])->assertOk()
            ->assertJsonPath('data.configured', true)
            ->assertJsonPath('data.password_configured', true)
            ->assertJsonMissingPath('data.password');

        $saved = MailSetting::findOrFail(1);
        $this->assertNotSame('smtp-application-secret', $saved->encrypted_password);
        $this->assertSame('smtp-application-secret', Crypt::decryptString($saved->encrypted_password));

        $this->putJson('/api/admin/mail-settings', [
            'host' => 'smtp.example.test',
            'port' => 587,
            'scheme' => 'smtp',
            'username' => 'mailer@example.test',
            'from_address' => 'quotes@example.test',
            'from_name' => 'Lumelex',
        ])->assertOk();

        $this->assertSame($saved->encrypted_password, MailSetting::findOrFail(1)->encrypted_password);
    }

    public function test_only_admins_can_configure_outgoing_mail(): void
    {
        $this->actingAs($this->createUserWithRole('gerente'));

        $this->getJson('/api/admin/mail-settings')->assertForbidden();
        $this->putJson('/api/admin/mail-settings', [])->assertForbidden();
    }

    public function test_admin_can_send_a_test_email_with_saved_mail_settings(): void
    {
        Mail::fake();
        $this->actingAs($this->createUserWithRole('admin'));
        $this->putJson('/api/admin/mail-settings', [
            'host' => 'smtp.example.test',
            'port' => 587,
            'scheme' => 'smtp',
            'username' => 'mailer@example.test',
            'password' => 'smtp-application-secret',
            'from_address' => 'quotes@example.test',
            'from_name' => 'Lumelex',
        ])->assertOk();

        $this->postJson('/api/admin/mail-settings/test', [
            'to' => 'admin@example.test',
        ])->assertOk()
            ->assertJsonPath('message', 'Correo de prueba enviado correctamente.');
    }

    public function test_microsoft_smtp_failure_recommends_oauth_and_logs_safe_connection_details(): void
    {
        $this->actingAs($this->createUserWithRole('admin'));
        $this->putJson('/api/admin/mail-settings', [
            'host' => 'smtp.office365.com',
            'port' => 587,
            'scheme' => 'smtp',
            'username' => 'mailer@example.test',
            'password' => 'smtp-application-secret',
            'from_address' => 'quotes@example.test',
            'from_name' => 'Lumelex',
        ])->assertOk();

        Mail::shouldReceive('mailer')
            ->once()
            ->with('configured-smtp')
            ->andThrow(new TransportException('Connection to "smtp.office365.com:587" timed out.'));
        Mail::shouldReceive('purge')->twice()->with('configured-smtp');

        $this->postJson('/api/admin/mail-settings/test', [
            'to' => 'admin@example.test',
        ])->assertStatus(502)
            ->assertJsonPath(
                'message',
                'Microsoft no completó el envío SMTP. En Administración → Correo saliente, conecta la cuenta desde “Cuenta Microsoft” y actívala para usar OAuth. Si necesitas SMTP, confirma que SMTP AUTH esté habilitado para el buzón y la organización.'
            );
    }

    public function test_gmail_smtp_failure_explains_application_password_requirements(): void
    {
        $this->actingAs($this->createUserWithRole('admin'));
        $this->putJson('/api/admin/mail-settings', [
            'host' => 'smtp.gmail.com',
            'port' => 587,
            'scheme' => 'smtp',
            'username' => 'mailer@gmail.com',
            'password' => 'gmail-app-password',
            'from_address' => 'mailer@gmail.com',
            'from_name' => 'Lumelex',
        ])->assertOk();

        Mail::shouldReceive('mailer')
            ->once()
            ->with('configured-smtp')
            ->andThrow(new TransportException('Connection to "smtp.gmail.com:587" timed out.'));
        Mail::shouldReceive('purge')->twice()->with('configured-smtp');

        $this->postJson('/api/admin/mail-settings/test', [
            'to' => 'admin@example.test',
        ])->assertStatus(502)
            ->assertJsonPath(
                'message',
                'Gmail no completó el envío SMTP. Usa smtp.gmail.com con STARTTLS/587, la dirección completa de Gmail como usuario y una contraseña de aplicación de Google (requiere verificación en dos pasos).'
            );
    }

    public function test_gmail_smtp_requires_authenticated_account_as_sender(): void
    {
        $this->actingAs($this->createUserWithRole('admin'));

        $this->putJson('/api/admin/mail-settings', [
            'host' => 'smtp.gmail.com',
            'port' => 587,
            'scheme' => 'smtp',
            'username' => 'mailer@gmail.com',
            'password' => 'gmail-app-password',
            'from_address' => 'different@example.com',
            'from_name' => 'Lumelex',
        ])->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Para Gmail, el usuario SMTP y el correo remitente deben ser la misma dirección de Gmail.'
            );

        $this->assertDatabaseMissing('mail_settings', ['id' => 1]);
    }

    public function test_admin_can_connect_a_microsoft_account_and_store_tokens_encrypted(): void
    {
        config([
            'services.microsoft_mail.client_id' => null,
            'services.microsoft_mail.client_secret' => null,
            'services.microsoft_mail.tenant_id' => 'common',
            'services.microsoft_mail.redirect_uri' => 'http://localhost:8000/microsoft-mail/callback',
        ]);
        $this->actingAs($this->createUserWithRole('admin'));
        $this->putJson('/api/admin/mail-settings/microsoft/app', [
            'client_id' => '11111111-2222-4333-8444-555555555555',
            'client_secret' => 'microsoft-client-secret-value',
        ])->assertOk()
            ->assertJsonPath('data.microsoft_app_configured', true)
            ->assertJsonPath('data.microsoft_client_id', '11111111-2222-4333-8444-555555555555')
            ->assertJsonMissingPath('data.microsoft_client_secret');

        $this->assertSame(
            'microsoft-client-secret-value',
            Crypt::decryptString(MailSetting::findOrFail(1)->encrypted_microsoft_client_secret)
        );
        $this->putJson('/api/admin/mail-settings/microsoft/app', [
            'client_id' => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        ])->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Al cambiar el Id. de aplicación también debes ingresar el secreto nuevo de esa aplicación.'
            );

        Http::fake([
            'https://login.microsoftonline.com/common/oauth2/v2.0/token' => Http::response([
                'access_token' => 'microsoft-access-token',
                'refresh_token' => 'microsoft-refresh-token',
                'expires_in' => 3600,
            ]),
            'https://graph.microsoft.com/v1.0/me*' => Http::response([
                'id' => 'microsoft-account-id',
                'mail' => 'lumelex@hotmail.com',
                'userPrincipalName' => 'lumelex@hotmail.com',
            ]),
        ]);

        $authorizationResponse = $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/admin/mail-settings/microsoft/connect');
        $this->assertSame(200, $authorizationResponse->getStatusCode(), $authorizationResponse->getContent());
        $authorizationUrl = $authorizationResponse->json('authorization_url');
        parse_str((string) parse_url($authorizationUrl, PHP_URL_QUERY), $authorizationParameters);
        $this->assertSame('11111111-2222-4333-8444-555555555555', $authorizationParameters['client_id']);
        $this->assertSame('select_account', $authorizationParameters['prompt']);

        $this->get('/microsoft-mail/callback?code=authorization-code&state='.$authorizationParameters['state'])
            ->assertRedirect('http://localhost:5173/admin/correo?microsoft=connected');
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/oauth2/v2.0/token')
            && $request['client_id'] === '11111111-2222-4333-8444-555555555555'
            && $request['client_secret'] === 'microsoft-client-secret-value');

        $settings = MailSetting::findOrFail(1);
        $this->assertSame('microsoft', $settings->provider);
        $this->assertSame('lumelex@hotmail.com', $settings->microsoft_email);
        $this->assertNotSame('microsoft-access-token', $settings->encrypted_access_token);
        $this->assertNotSame('microsoft-refresh-token', $settings->encrypted_refresh_token);
        $this->assertSame('microsoft-refresh-token', Crypt::decryptString($settings->encrypted_refresh_token));
    }

    public function test_microsoft_test_email_uses_the_connected_graph_account(): void
    {
        $this->actingAs($this->createUserWithRole('admin'));
        MailSetting::create([
            'id' => 1,
            'provider' => 'microsoft',
            'host' => 'smtp-mail.outlook.com',
            'port' => 587,
            'scheme' => 'smtp',
            'username' => 'lumelex@hotmail.com',
            'microsoft_account_id' => 'account-id',
            'microsoft_email' => 'lumelex@hotmail.com',
            'encrypted_access_token' => Crypt::encryptString('valid-access-token'),
            'encrypted_refresh_token' => Crypt::encryptString('valid-refresh-token'),
            'microsoft_token_expires_at' => now()->addHour(),
            'from_address' => 'lumelex@hotmail.com',
            'from_name' => 'Lumelex',
        ]);
        Http::fake([
            'https://graph.microsoft.com/v1.0/me/sendMail' => Http::response([], 202),
        ]);

        $this->postJson('/api/admin/mail-settings/test', [
            'to' => 'recipient@example.test',
        ])->assertOk()
            ->assertJsonPath('message', 'Correo de prueba enviado correctamente.');

        Http::assertSent(fn ($request) => $request->url() === 'https://graph.microsoft.com/v1.0/me/sendMail'
            && $request['message']['toRecipients'][0]['emailAddress']['address'] === 'recipient@example.test');
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
}
