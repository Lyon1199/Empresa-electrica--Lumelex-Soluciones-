<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mail_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->string('host', 255);
            $table->unsignedSmallInteger('port')->default(587);
            $table->string('scheme', 10)->default('smtp');
            $table->string('username')->nullable();
            $table->text('encrypted_password')->nullable();
            $table->string('from_address');
            $table->string('from_name', 150);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_settings');
    }
};
