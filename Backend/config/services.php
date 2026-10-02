<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'microsoft_mail' => [
        'client_id' => env('MICROSOFT_MAIL_CLIENT_ID'),
        'client_secret' => env('MICROSOFT_MAIL_CLIENT_SECRET'),
        'tenant_id' => env('MICROSOFT_MAIL_TENANT_ID', 'common'),
        'redirect_uri' => env('MICROSOFT_MAIL_REDIRECT_URI', 'http://localhost:8000/microsoft-mail/callback'),
        'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
