<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('identification', 10)->nullable()->unique();
        });

        Schema::table('quotations', function (Blueprint $table) {
            $table->timestamp('sent_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->dropColumn('sent_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['identification']);
            $table->dropColumn('identification');
        });
    }
};
