<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_order_user', function (Blueprint $table) {
            $table->string('assignment_type', 20)->default('tecnico');
        });

        Schema::create('project_update_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_update_id')->constrained()->cascadeOnDelete();
            $table->string('disk')->default('local');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->timestamps();
        });

        DB::table('roles')->updateOrInsert(
            ['slug' => 'lider_proyecto'],
            [
                'name' => 'Líder de proyecto',
                'description' => 'Gestiona los avances y reportes de los proyectos asignados.',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('project_update_photos');
        Schema::table('work_order_user', function (Blueprint $table) {
            $table->dropColumn('assignment_type');
        });
        DB::table('roles')->where('slug', 'lider_proyecto')->delete();
    }
};
