<?php

$configuredOrigins = array_filter(array_map(
    'trim',
    explode(',', env(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173'
    ))
));

return [

    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
    ],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_unique([
        ...$configuredOrigins,
        'https://empresa-electrica-lumelex-solucione-seven.vercel.app',
        'https://empresa-electrica-lumelex-soluciones-tu2z-git-main-lyon1199.vercel.app',
    ])),

    'allowed_origins_patterns' => [
        '#^https://empresa-electrica-lumelex-solucione(?:-[a-z0-9-]+)?\.vercel\.app$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];