<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mail_settings', function (Blueprint $table) {
            $table->string('microsoft_client_id')->nullable();
            $table->text('encrypted_microsoft_client_secret')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('mail_settings', function (Blueprint $table) {
            $table->dropColumn([
                'microsoft_client_id',
                'encrypted_microsoft_client_secret',
            ]);
        });
    }
};
