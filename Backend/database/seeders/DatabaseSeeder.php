<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(InventoryProductSeeder::class);

        /*
        |--------------------------------------------------------------------------
        | ROLES
        |--------------------------------------------------------------------------
        */

        $roles = [
            [
                'name' => 'Administrador',
                'slug' => 'admin',
                'description' => 'Acceso completo al sistema.',
            ],
            [
                'name' => 'Gerente',
                'slug' => 'gerente',
                'description' => 'Gestión general de la empresa.',
            ],
            [
                'name' => 'Contabilidad',
                'slug' => 'contabilidad',
                'description' => 'Gestión financiera y contable.',
            ],
            [
                'name' => 'Bodega',
                'slug' => 'bodega',
                'description' => 'Gestión de inventario y almacén.',
            ],
            [
                'name' => 'Supervisor',
                'slug' => 'supervisor',
                'description' => 'Supervisión de proyectos y órdenes.',
            ],
            [
                'name' => 'Líder de proyecto',
                'slug' => 'lider_proyecto',
                'description' => 'Gestiona los avances y reportes de los proyectos asignados.',
            ],
            [
                'name' => 'Técnico',
                'slug' => 'tecnico',
                'description' => 'Ejecución de trabajos técnicos.',
            ],
            [
                'name' => 'Cliente',
                'slug' => 'cliente',
                'description' => 'Acceso al portal del cliente.',
            ],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(
                ['slug' => $role['slug']],
                $role
            );
        }

        /*
        |--------------------------------------------------------------------------
        | PERMISOS
        |--------------------------------------------------------------------------
        */

        $modules = [
            'users',
            'roles',
            'customers',
            'suppliers',
            'services',
            'projects',
            'work_orders',
            'inventory',
            'purchases',
            'quotations',
            'expenses',
            'invoices',
            'payments',
            'cash',
            'documents',
            'reports',
        ];

        $actions = [
            'view',
            'create',
            'update',
            'delete',
        ];

        foreach ($modules as $module) {
            foreach ($actions as $action) {

                $slug = "{$module}.{$action}";

                Permission::updateOrCreate(
                    ['slug' => $slug],
                    [
                        'name' => ucfirst($action).' '.$module,
                        'slug' => $slug,
                        'module' => $module,
                        'description' => "Permite {$action} en {$module}.",
                    ]
                );
            }
        }

        /*
        |--------------------------------------------------------------------------
        | PERMISOS ESPECIALES
        |--------------------------------------------------------------------------
        */

        $specialPermissions = [
            [
                'name' => 'Ajustar inventario',
                'slug' => 'inventory.adjust',
                'module' => 'inventory',
            ],
            [
                'name' => 'Aprobar gastos',
                'slug' => 'expenses.approve',
                'module' => 'expenses',
            ],
            [
                'name' => 'Anular facturas',
                'slug' => 'invoices.cancel',
                'module' => 'invoices',
            ],
            [
                'name' => 'Ver auditoría',
                'slug' => 'audit.view',
                'module' => 'audit',
            ],
        ];

        foreach ($specialPermissions as $permission) {
            Permission::updateOrCreate(
                ['slug' => $permission['slug']],
                $permission
            );
        }

        /*
        |--------------------------------------------------------------------------
        | ADMINISTRADOR → TODOS LOS PERMISOS
        |--------------------------------------------------------------------------
        */

        $adminRole = Role::where('slug', 'admin')->first();

        $allPermissions = Permission::all();

        $adminRole->permissions()->sync(
            $allPermissions->pluck('id')->toArray()
        );

        /*
        |--------------------------------------------------------------------------
        | USUARIO ADMINISTRADOR
        |--------------------------------------------------------------------------
        */

        $admin = User::updateOrCreate(
            [
                'email' => 'admin@lumelex.com',
            ],
            [
                'name' => 'Administrador Lumelex',
                'password' => Hash::make('Admin12345!'),
            ]
        );

        $admin->roles()->syncWithoutDetaching([
            $adminRole->id,
        ]);

        $this->command->info(
            'Roles, permisos y administrador creados correctamente.'
        );

        $this->command->info(
            'Usuario: admin@lumelex.com'
        );

        $this->command->info(
            'Contraseña: Admin12345!'
        );
    }
}
