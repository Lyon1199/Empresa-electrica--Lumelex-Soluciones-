<?php

namespace App\Services;

use App\Models\MailSetting;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MicrosoftGraphMailService
{
    private const SCOPES = [
        'offline_access',
        'https://graph.microsoft.com/Mail.Send',
        'https://graph.microsoft.com/User.Read',
    ];

    public function authorizationUrl(string $state, ?MailSetting $settings = null): string
    {
        $this->assertConfigured($settings);

        return 'https://login.microsoftonline.com/'.$this->tenantId().'/oauth2/v2.0/authorize?'.http_build_query([
            'client_id' => $this->clientId($settings),
            'response_type' => 'code',
            'redirect_uri' => $this->redirectUri(),
            'response_mode' => 'query',
            'scope' => implode(' ', self::SCOPES),
            'state' => $state,
            'prompt' => 'select_account',
        ]);
    }

    public function connectAccount(string $code, ?MailSetting $settings = null): array
    {
        $tokens = $this->tokenRequest([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $this->redirectUri(),
            'scope' => implode(' ', self::SCOPES),
        ], $settings);

        $profile = Http::withToken($tokens['access_token'])
            ->acceptJson()
            ->timeout(15)
            ->get('https://graph.microsoft.com/v1.0/me', [
                '$select' => 'id,mail,userPrincipalName',
            ])
            ->throw()
            ->json();

        $email = $profile['mail'] ?? $profile['userPrincipalName'] ?? null;
        if (empty($profile['id']) || ! is_string($email) || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Microsoft no devolvió una dirección de correo válida para la cuenta.');
        }

        if (empty($tokens['refresh_token'])) {
            throw new RuntimeException('Microsoft no devolvió un token de renovación. Revisa que la aplicación solicite offline_access.');
        }

        return [
            'account_id' => (string) $profile['id'],
            'email' => $email,
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
            'expires_at' => now()->addSeconds((int) ($tokens['expires_in'] ?? 3600)),
        ];
    }

    public function send(
        MailSetting $settings,
        string $recipient,
        string $subject,
        string $body,
        string $contentType = 'HTML',
        ?array $attachment = null,
    ): void {
        $accessToken = $this->accessToken($settings);
        $message = [
            'subject' => $subject,
            'body' => [
                'contentType' => $contentType,
                'content' => $body,
            ],
            'toRecipients' => [[
                'emailAddress' => ['address' => $recipient],
            ]],
        ];

        if ($attachment !== null) {
            $message['attachments'] = [[
                '@odata.type' => '#microsoft.graph.fileAttachment',
                'name' => $attachment['name'],
                'contentType' => $attachment['content_type'],
                'contentBytes' => base64_encode($attachment['content']),
            ]];
        }

        Http::withToken($accessToken)
            ->acceptJson()
            ->timeout(30)
            ->post('https://graph.microsoft.com/v1.0/me/sendMail', [
                'message' => $message,
                'saveToSentItems' => true,
            ])
            ->throw();
    }

    private function accessToken(MailSetting $settings): string
    {
        if (! filled($settings->encrypted_refresh_token)) {
            throw new RuntimeException('Conecta primero una cuenta Microsoft para enviar correos.');
        }

        if ($settings->microsoft_token_expires_at?->gt(now()->addMinutes(5))
            && filled($settings->encrypted_access_token)) {
            return Crypt::decryptString($settings->encrypted_access_token);
        }

        $token = $this->tokenRequest([
            'grant_type' => 'refresh_token',
            'refresh_token' => Crypt::decryptString($settings->encrypted_refresh_token),
            'scope' => implode(' ', self::SCOPES),
        ], $settings);

        if (isset($token['refresh_token'])) {
            $settings->encrypted_refresh_token = Crypt::encryptString($token['refresh_token']);
        }
        $settings->encrypted_access_token = Crypt::encryptString($token['access_token']);
        $settings->microsoft_token_expires_at = now()->addSeconds((int) ($token['expires_in'] ?? 3600));
        $settings->save();

        return $token['access_token'];
    }

    private function tokenRequest(array $payload, ?MailSetting $settings = null): array
    {
        $this->assertConfigured($settings);
        $response = Http::asForm()
            ->acceptJson()
            ->timeout(15)
            ->post('https://login.microsoftonline.com/'.$this->tenantId().'/oauth2/v2.0/token', [
                ...$payload,
                'client_id' => $this->clientId($settings),
                'client_secret' => $this->clientSecret($settings),
            ]);

        $this->throwUnlessSuccessful($response);
        $tokens = $response->json();

        if (empty($tokens['access_token'])) {
            throw new RuntimeException('Microsoft no devolvió un token de acceso válido.');
        }

        return $tokens;
    }

    private function throwUnlessSuccessful(Response $response): void
    {
        if (! $response->successful()) {
            throw new RuntimeException('Microsoft rechazó la autenticación o el envío del correo.');
        }
    }

    private function assertConfigured(?MailSetting $settings = null): void
    {
        if (! filled($this->clientId($settings)) || ! filled($this->clientSecret($settings))) {
            throw new RuntimeException('Primero configura el identificador y el secreto de la aplicación Microsoft en Correo saliente.');
        }
    }

    private function clientId(?MailSetting $settings): ?string
    {
        return $settings?->microsoft_client_id ?: config('services.microsoft_mail.client_id');
    }

    private function clientSecret(?MailSetting $settings): ?string
    {
        if (filled($settings?->encrypted_microsoft_client_secret)) {
            return Crypt::decryptString($settings->encrypted_microsoft_client_secret);
        }

        if (filled($settings?->microsoft_client_id)
            && $settings->microsoft_client_id !== config('services.microsoft_mail.client_id')) {
            return null;
        }

        return config('services.microsoft_mail.client_secret');
    }

    private function tenantId(): string
    {
        return (string) config('services.microsoft_mail.tenant_id', 'common');
    }

    private function redirectUri(): string
    {
        return (string) config('services.microsoft_mail.redirect_uri');
    }
}
