<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ManagerSignatureSetting extends Model
{
    protected $fillable = [
        'signer_name',
        'encrypted_certificate',
        'encrypted_certificate_password',
        'certificate_subject',
        'certificate_expires_at',
        'updated_by',
    ];

    protected $hidden = [
        'encrypted_certificate',
        'encrypted_certificate_password',
    ];

    protected function casts(): array
    {
        return [
            'certificate_expires_at' => 'datetime',
        ];
    }
}
