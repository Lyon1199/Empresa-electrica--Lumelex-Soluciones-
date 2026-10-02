<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mail_settings', function (Blueprint $table) {
            $table->string('provider', 20)->default('smtp')->after('id');
            $table->string('microsoft_account_id')->nullable();
            $table->string('microsoft_email')->nullable();
            $table->text('encrypted_access_token')->nullable();
            $table->text('encrypted_refresh_token')->nullable();
            $table->timestamp('microsoft_token_expires_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('mail_settings', function (Blueprint $table) {
            $table->dropColumn([
                'provider',
                'microsoft_account_id',
                'microsoft_email',
                'encrypted_access_token',
                'encrypted_refresh_token',
                'microsoft_token_expires_at',
            ]);
        });
    }
};
