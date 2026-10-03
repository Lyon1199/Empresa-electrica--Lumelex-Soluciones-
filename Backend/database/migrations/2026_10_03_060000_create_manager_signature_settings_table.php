<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manager_signature_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->string('signer_name', 150)->default('Alex Lucas');
            $table->longText('encrypted_certificate')->nullable();
            $table->longText('encrypted_certificate_password')->nullable();
            $table->string('certificate_subject')->nullable();
            $table->timestamp('certificate_expires_at')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        if (Schema::hasTable('sri_settings')) {
            $legacySettings = DB::table('sri_settings')->where('id', 1)->first();
            if ($legacySettings && filled($legacySettings->encrypted_certificate)) {
                DB::table('manager_signature_settings')->insert([
                    'id' => 1,
                    'signer_name' => 'Alex Lucas',
                    'encrypted_certificate' => $legacySettings->encrypted_certificate,
                    'encrypted_certificate_password' => $legacySettings->encrypted_certificate_password,
                    'updated_by' => $legacySettings->updated_by,
                    'created_at' => $legacySettings->created_at,
                    'updated_at' => $legacySettings->updated_at,
                ]);
                DB::table('sri_settings')->where('id', 1)->update([
                    'encrypted_certificate' => null,
                    'encrypted_certificate_password' => null,
                ]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('sri_settings')) {
            $settings = DB::table('manager_signature_settings')->where('id', 1)->first();
            if ($settings && Schema::hasColumn('sri_settings', 'encrypted_certificate')) {
                DB::table('sri_settings')->updateOrInsert(
                    ['id' => 1],
                    [
                        'encrypted_certificate' => $settings->encrypted_certificate,
                        'encrypted_certificate_password' => $settings->encrypted_certificate_password,
                        'updated_by' => $settings->updated_by,
                    ],
                );
            }
        }

        Schema::dropIfExists('manager_signature_settings');
    }
};
