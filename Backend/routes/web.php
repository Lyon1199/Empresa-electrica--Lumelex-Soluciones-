<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Admin\MailSettingsController;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/microsoft-mail/callback', [MailSettingsController::class, 'microsoftCallback']);
