<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ManagerSignatureSetting;
use App\Services\ElectronicSignatureCertificateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ElectronicSignatureSettingsController extends Controller
{
    public function show()
    {
        $settings = ManagerSignatureSetting::query()->find(1);

        return response()->json([
            'data' => [
                'signer_name' => $settings?->signer_name ?? 'Alex Lucas',
                'certificate_configured' => filled($settings?->encrypted_certificate),
                'certificate_subject' => $settings?->certificate_subject,
                'certificate_expires_at' => $settings?->certificate_expires_at?->toISOString(),
            ],
        ]);
    }

    public function update(Request $request, ElectronicSignatureCertificateService $certificates)
    {
        $data = $request->validate([
            'signer_name' => ['required', 'string', 'max:150'],
            'certificate' => ['nullable', 'file', 'max:2048'],
            'certificate_password' => ['nullable', 'string', 'max:1000', 'required_with:certificate'],
        ]);

        $settings = ManagerSignatureSetting::query()->find(1)
            ?? new ManagerSignatureSetting(['id' => 1]);
        $certificateFile = $request->file('certificate');
        if ($certificateFile) {
            if (! in_array(strtolower($certificateFile->getClientOriginalExtension()), ['p12', 'pfx'], true)) {
                return response()->json([
                    'message' => 'El certificado debe tener extensión .p12 o .pfx.',
                ], 422);
            }

            $contents = file_get_contents($certificateFile->getRealPath());
            if (! is_string($contents)) {
                return response()->json([
                    'message' => 'No se pudo leer el archivo de firma electrónica.',
                ], 422);
            }

            try {
                $metadata = $certificates->inspect($contents, $data['certificate_password']);
            } catch (RuntimeException $exception) {
                Log::warning('Se rechazó un certificado de firma electrónica del gerente.', [
                    'reason' => $exception->getMessage(),
                ]);

                return response()->json([
                    'message' => $exception->getMessage(),
                ], 422);
            }

            $settings->encrypted_certificate = Crypt::encryptString($contents);
            $settings->encrypted_certificate_password = Crypt::encryptString($data['certificate_password']);
            $settings->certificate_subject = $metadata['subject'];
            $settings->certificate_expires_at = date('Y-m-d H:i:s', $metadata['expires_at']);
        } elseif (! filled($settings->encrypted_certificate)
            || ! filled($settings->encrypted_certificate_password)) {
            return response()->json([
                'message' => 'Sube el certificado .p12/.pfx y su contraseña para completar la configuración.',
            ], 422);
        }

        $settings->id = 1;
        $settings->signer_name = $data['signer_name'];
        $settings->updated_by = $request->user()->id;
        $settings->save();

        return $this->show();
    }
}
