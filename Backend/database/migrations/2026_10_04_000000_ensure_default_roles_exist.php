<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const ROLES = [
        ['Administrador', 'admin', 'Acceso completo al sistema.'],
        ['Gerente', 'gerente', 'Gestión general de la empresa.'],
        ['Contabilidad', 'contabilidad', 'Gestión financiera y contable.'],
        ['Bodega', 'bodega', 'Gestión de inventario y almacén.'],
        ['Supervisor', 'supervisor', 'Supervisión de proyectos y órdenes.'],
        ['Líder de proyecto', 'lider_proyecto', 'Gestiona los avances y reportes de proyectos.'],
        ['Técnico', 'tecnico', 'Ejecución de trabajos técnicos.'],
        ['Cliente', 'cliente', 'Acceso al portal del cliente.'],
    ];

    public function up(): void
    {
        foreach (self::ROLES as [$name, $slug, $description]) {
            DB::table('roles')->updateOrInsert(
                ['slug' => $slug],
                [
                    'name' => $name,
                    'description' => $description,
                    'active' => DB::raw('true'),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }

    public function down(): void
    {
        DB::table('roles')
            ->whereIn('slug', array_column(self::ROLES, 1))
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('role_user')
                    ->whereColumn('role_user.role_id', 'roles.id');
            })
            ->delete();
    }
};
