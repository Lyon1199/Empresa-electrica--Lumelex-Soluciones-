<?php

namespace App\Services;

use RuntimeException;

class ElectronicSignatureCertificateService
{
    public function inspect(string $contents, string $password): array
    {
        if (! function_exists('openssl_pkcs12_read')) {
            throw new RuntimeException('La extensión OpenSSL de PHP no está disponible.');
        }

        if (! openssl_pkcs12_read($contents, $certificate, $password)) {
            throw new RuntimeException('No se pudo abrir el certificado .p12/.pfx. Verifica el archivo y su contraseña.');
        }

        if (empty($certificate['pkey']) || empty($certificate['cert'])) {
            throw new RuntimeException('El archivo no contiene un certificado y una clave privada utilizables.');
        }

        $details = openssl_x509_parse($certificate['cert']);
        if (! is_array($details) || ! isset($details['validTo_time_t'])) {
            throw new RuntimeException('No se pudo leer la vigencia del certificado electrónico.');
        }

        if ((int) $details['validTo_time_t'] <= time()) {
            throw new RuntimeException('El certificado electrónico está vencido.');
        }

        $subject = $details['subject']['CN'] ?? $details['subject']['O'] ?? null;

        return [
            'subject' => is_string($subject) ? $subject : null,
            'expires_at' => (int) $details['validTo_time_t'],
        ];
    }
}
