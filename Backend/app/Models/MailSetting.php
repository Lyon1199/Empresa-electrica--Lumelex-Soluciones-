<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MailSetting extends Model
{
    protected $fillable = [
        'provider',
        'host',
        'port',
        'scheme',
        'username',
        'encrypted_password',
        'microsoft_account_id',
        'microsoft_email',
        'microsoft_client_id',
        'encrypted_microsoft_client_secret',
        'encrypted_access_token',
        'encrypted_refresh_token',
        'microsoft_token_expires_at',
        'from_address',
        'from_name',
        'updated_by',
    ];

    protected $hidden = [
        'encrypted_password',
        'encrypted_microsoft_client_secret',
        'encrypted_access_token',
        'encrypted_refresh_token',
    ];

    protected function casts(): array
    {
        return [
            'microsoft_token_expires_at' => 'datetime',
        ];
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
