<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MailSetting;
use App\Services\MicrosoftGraphMailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class MailSettingsController extends Controller
{
    public function connectMicrosoft(Request $request, MicrosoftGraphMailService $microsoft)
    {
        try {
            $state = Str::random(64);
            $request->session()->put('microsoft_mail_oauth_state', $state);
            $settings = MailSetting::query()->find(1);

            return response()->json([
                'authorization_url' => $microsoft->authorizationUrl($state, $settings),
            ]);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 503);
        }
    }

    public function updateMicrosoftApp(Request $request)
    {
        $data = $request->validate([
            'client_id' => ['required', 'uuid'],
            'client_secret' => ['nullable', 'string', 'max:2000'],
        ]);

        $settings = MailSetting::query()->find(1) ?? new MailSetting([
            'id' => 1,
            'host' => 'smtp-mail.outlook.com',
            'port' => 587,
            'scheme' => 'smtp',
            'from_address' => 'pending@outlook.com',
            'from_name' => config('app.name', 'Lumelex'),
        ]);
        $environmentClientId = config('services.microsoft_mail.client_id');
        $applicationChanged = $settings->exists
            && $settings->microsoft_client_id !== $data['client_id'];
        if ($applicationChanged
            && ! filled($data['client_secret'] ?? null)
            && (! filled(config('services.microsoft_mail.client_secret'))
                || $environmentClientId !== $data['client_id'])) {
            return response()->json([
                'message' => 'Al cambiar el Id. de aplicación también debes ingresar el secreto nuevo de esa aplicación.',
            ], 422);
        }

        $settings->id = 1;
        $settings->microsoft_client_id = $data['client_id'];
        if (filled($data['client_secret'] ?? null)) {
            $settings->encrypted_microsoft_client_secret = Crypt::encryptString($data['client_secret']);
        } elseif (! filled($settings->encrypted_microsoft_client_secret)
            && ! filled(config('services.microsoft_mail.client_secret'))) {
            return response()->json([
                'message' => 'Ingresa el valor del secreto de cliente creado en Microsoft Entra.',
            ], 422);
        }
        $settings->save();

        return $this->show();
    }

    public function microsoftCallback(Request $request, MicrosoftGraphMailService $microsoft)
    {
        $expectedState = $request->session()->pull('microsoft_mail_oauth_state');
        $frontendUrl = rtrim((string) config('services.microsoft_mail.frontend_url'), '/').'/admin/correo';

        if (! is_string($expectedState)
            || ! is_string($request->query('state'))
            || ! hash_equals($expectedState, $request->query('state'))) {
            return redirect($frontendUrl.'?microsoft=error&reason=state');
        }

        if ($request->filled('error') || ! $request->filled('code')) {
            return redirect($frontendUrl.'?microsoft=error&reason=authorization');
        }

        try {
            $settings = MailSetting::query()->find(1) ?? new MailSetting([
                'id' => 1,
                'host' => 'smtp-mail.outlook.com',
                'port' => 587,
                'scheme' => 'smtp',
                'from_address' => 'pending@outlook.com',
                'from_name' => config('app.name', 'Lumelex'),
            ]);
            $account = $microsoft->connectAccount((string) $request->query('code'), $settings);
            $settings->id = 1;
            $settings->provider = 'microsoft';
            $settings->username = $account['email'];
            $settings->from_address = $account['email'];
            $settings->microsoft_account_id = $account['account_id'];
            $settings->microsoft_email = $account['email'];
            $settings->encrypted_access_token = Crypt::encryptString($account['access_token']);
            $settings->encrypted_refresh_token = Crypt::encryptString($account['refresh_token']);
            $settings->microsoft_token_expires_at = $account['expires_at'];
            $settings->save();

            return redirect($frontendUrl.'?microsoft=connected');
        } catch (Throwable $exception) {
            Log::error('No se pudo conectar una cuenta Microsoft para correo.', [
                'exception' => $exception::class,
            ]);

            return redirect($frontendUrl.'?microsoft=error&reason=connection');
        }
    }

    public function useMicrosoft()
    {
        $settings = MailSetting::query()->find(1);
        if (! $settings || ! filled($settings->encrypted_refresh_token) || ! filled($settings->microsoft_email)) {
            return response()->json([
                'message' => 'Conecta primero una cuenta Microsoft.',
            ], 422);
        }

        $settings->provider = 'microsoft';
        $settings->from_address = $settings->microsoft_email;
        $settings->save();

        return $this->show();
    }

    public function show()
    {
        $settings = MailSetting::query()->find(1);

        return response()->json([
            'data' => [
                'configured' => $settings !== null,
                'provider' => $settings?->provider ?? 'smtp',
                'host' => $settings?->host,
                'port' => $settings?->port,
                'scheme' => $settings?->scheme ?? 'smtp',
                'username' => $settings?->username,
                'from_address' => $settings?->from_address,
                'from_name' => $settings?->from_name,
                'password_configured' => filled($settings?->encrypted_password),
                'microsoft_connected' => filled($settings?->encrypted_refresh_token),
                'microsoft_email' => $settings?->microsoft_email,
                'microsoft_app_configured' => filled($settings?->microsoft_client_id ?: config('services.microsoft_mail.client_id'))
                    && (filled($settings?->encrypted_microsoft_client_secret)
                        || filled(config('services.microsoft_mail.client_secret'))),
                'microsoft_client_id' => $settings?->microsoft_client_id
                    ?: config('services.microsoft_mail.client_id'),
                'microsoft_client_secret_configured' => filled($settings?->encrypted_microsoft_client_secret)
                    || filled(config('services.microsoft_mail.client_secret')),
                'microsoft_redirect_uri' => config('services.microsoft_mail.redirect_uri'),
            ],
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'host' => ['required', 'string', 'max:255'],
            'port' => ['required', 'integer', 'between:1,65535'],
            'scheme' => ['required', 'in:smtp,smtps'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:1000'],
            'from_address' => ['required', 'email', 'max:255'],
            'from_name' => ['required', 'string', 'max:150'],
        ]);

        $settings = MailSetting::query()->find(1) ?? new MailSetting(['id' => 1]);
        $settings->id = 1;
        $settings->fill([
            'provider' => 'smtp',
            'host' => $data['host'],
            'port' => $data['port'],
            'scheme' => $data['scheme'],
            'username' => $data['username'] ?? null,
            'from_address' => $data['from_address'],
            'from_name' => $data['from_name'],
            'updated_by' => $request->user()->id,
        ]);
        if (filled($data['password'] ?? null)) {
            $settings->encrypted_password = Crypt::encryptString($data['password']);
        }
        $settings->save();

        return $this->show();
    }

    public function test(Request $request)
    {
        $data = $request->validate([
            'to' => ['required', 'email', 'max:255'],
        ]);
        $settings = MailSetting::query()->find(1);
        if (! $settings) {
            return response()->json(['message' => 'Guarda primero la configuración del correo.'], 422);
        }

        try {
            if ($settings->provider === 'microsoft') {
                app(MicrosoftGraphMailService::class)->send(
                    $settings,
                    $data['to'],
                    'Prueba de correo - Lumelex ERP',
                    'Este es un mensaje de prueba enviado desde Lumelex ERP.',
                    'Text',
                );

                return response()->json(['message' => 'Correo de prueba enviado correctamente.']);
            }

            $this->configureMailer($settings);
            Mail::mailer('configured-smtp')->raw(
                'Este es un mensaje de prueba enviado desde Lumelex ERP.',
                function ($message) use ($data, $settings) {
                    $message->to($data['to'])
                        ->from($settings->from_address, $settings->from_name)
                        ->subject('Prueba de correo - Lumelex ERP');
                }
            );
        } catch (Throwable $exception) {
            Log::error('No se pudo enviar el correo de prueba de Lumelex.', [
                'exception' => $exception::class,
            ]);

            return response()->json([
                'message' => $settings->provider === 'microsoft'
                    ? 'Falló el envío con Microsoft. Vuelve a conectar la cuenta y confirma que autorizaste el permiso Mail.Send.'
                    : 'Falló la conexión de correo. Verifica host, puerto, seguridad y credenciales SMTP.',
            ], 502);
        } finally {
            Mail::purge('configured-smtp');
        }

        return response()->json(['message' => 'Correo de prueba enviado correctamente.']);
    }

    public function configureMailer(MailSetting $settings): void
    {
        $password = filled($settings->encrypted_password)
            ? Crypt::decryptString($settings->encrypted_password)
            : null;

        config([
            'mail.mailers.configured-smtp' => [
                'transport' => 'smtp',
                'scheme' => $settings->scheme,
                'host' => $settings->host,
                'port' => $settings->port,
                'username' => $settings->username,
                'password' => $password,
                'timeout' => 15,
                'local_domain' => parse_url((string) config('app.url'), PHP_URL_HOST),
            ],
        ]);
        Mail::purge('configured-smtp');
    }
}
