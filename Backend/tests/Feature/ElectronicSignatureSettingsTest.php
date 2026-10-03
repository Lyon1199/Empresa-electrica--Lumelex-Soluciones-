<?php

namespace Tests\Feature;

use App\Models\ManagerSignatureSetting;
use App\Models\Role;
use App\Models\User;
use App\Services\ElectronicSignatureCertificateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Mockery;
use Tests\TestCase;

class ElectronicSignatureSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_manager_can_save_encrypted_certificate_and_read_its_metadata(): void
    {
        $this->actingAs($this->createUserWithRole('gerente'));
        $certificateContents = 'encrypted p12 fixture';
        $certificate = UploadedFile::fake()->createWithContent('gerente.p12', $certificateContents);
        $validator = Mockery::mock(ElectronicSignatureCertificateService::class);
        $validator->shouldReceive('inspect')
            ->once()
            ->with($certificateContents, 'certificate-password')
            ->andReturn([
                'subject' => 'Alex Lucas',
                'expires_at' => now()->addYear()->timestamp,
            ]);
        $this->instance(ElectronicSignatureCertificateService::class, $validator);

        $this->post('/api/admin/electronic-signature-settings', [
            'signer_name' => 'Alex Lucas',
            'certificate' => $certificate,
            'certificate_password' => 'certificate-password',
        ])->assertOk()
            ->assertJsonPath('data.signer_name', 'Alex Lucas')
            ->assertJsonPath('data.certificate_configured', true)
            ->assertJsonPath('data.certificate_subject', 'Alex Lucas')
            ->assertJsonMissingPath('data.encrypted_certificate')
            ->assertJsonMissingPath('data.certificate_password');

        $saved = ManagerSignatureSetting::query()->findOrFail(1);
        $this->assertSame($certificateContents, Crypt::decryptString($saved->encrypted_certificate));
        $this->assertSame('certificate-password', Crypt::decryptString($saved->encrypted_certificate_password));
    }

    public function test_only_administrators_and_managers_can_access_certificate_settings(): void
    {
        $this->actingAs($this->createUserWithRole('contabilidad'));

        $this->getJson('/api/admin/electronic-signature-settings')->assertForbidden();
        $this->postJson('/api/admin/electronic-signature-settings', [
            'signer_name' => 'Alex Lucas',
        ])->assertForbidden();
    }

    public function test_certificate_is_required_until_one_is_configured(): void
    {
        $this->actingAs($this->createUserWithRole('admin'));

        $this->postJson('/api/admin/electronic-signature-settings', [
            'signer_name' => 'Alex Lucas',
        ])->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Sube el certificado .p12/.pfx y su contraseña para completar la configuración.'
            );
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
