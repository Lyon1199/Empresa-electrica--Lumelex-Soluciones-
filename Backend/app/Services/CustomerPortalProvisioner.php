<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Project;
use App\Models\Quotation;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Str;
use RuntimeException;

class CustomerPortalProvisioner
{
    /**
     * @return array{project: Project, credentials: array{email: string, password: string}|null}
     */
    public function provision(Quotation $quotation, ?int $createdBy): array
    {
        if ($quotation->status !== 'accepted') {
            throw new RuntimeException('Solo se pueden convertir cotizaciones aceptadas.');
        }

        $customer = Customer::query()
            ->lockForUpdate()
            ->findOrFail($quotation->customer_id);

        $project = Project::firstOrCreate(
            ['quotation_id' => $quotation->id],
            [
                'customer_id' => $customer->id,
                'title' => $quotation->title,
                'status' => 'planning',
                'progress' => 0,
                'description' => $quotation->scope,
                'created_by' => $createdBy,
            ]
        );

        if ($project->wasRecentlyCreated) {
            $project->number = sprintf('PRO-%s-%05d', now()->format('Y'), $project->id);
            $project->save();
            $project->updates()->create([
                'created_by' => $createdBy,
                'title' => 'Proyecto creado',
                'description' => 'El cliente aceptó la cotización y el proyecto fue creado.',
                'progress' => 0,
                'visible_to_customer' => true,
            ]);
        }

        $year = now()->format('Y');
        $sequence = str_pad((string) $project->id, 5, '0', STR_PAD_LEFT);
        if (preg_match('/^PRO-(\d{4})-(\d+)$/', (string) $project->number, $matches)) {
            $year = $matches[1];
            $sequence = $matches[2];
        }
        $project->workOrder()->firstOrCreate(
            ['project_id' => $project->id],
            [
                'number' => "OT-{$year}-{$sequence}",
                'status' => 'pending',
                'description' => $project->description,
                'created_by' => $createdBy,
            ]
        );

        $user = User::where('customer_id', $customer->id)
            ->lockForUpdate()
            ->first();

        if ($user) {
            return ['project' => $project, 'credentials' => null];
        }

        $role = Role::where('slug', 'cliente')->where('active', true)->first();
        if (! $role) {
            throw new RuntimeException('No existe el rol activo de cliente. Ejecuta los seeders de roles.');
        }

        $email = $customer->email
            ? Str::lower($customer->email)
            : sprintf('cliente.%d@portal.lumelex.local', $customer->id);

        if (User::where('email', $email)->exists()) {
            $email = sprintf('cliente.%d@portal.lumelex.local', $customer->id);
        }

        if (User::where('email', $email)->exists()) {
            throw new RuntimeException('No se pudo crear un correo de acceso único para el portal del cliente.');
        }

        $password = $customer->identification;
        $user = User::create([
            'customer_id' => $customer->id,
            'name' => $customer->customer_type === 'company'
                ? ($customer->contact_person ?: $customer->name)
                : $customer->name,
            'email' => $email,
            'password' => $password,
            'must_change_password' => true,
        ]);
        $user->roles()->syncWithoutDetaching([$role->id]);

        return [
            'project' => $project,
            'credentials' => [
                'email' => $email,
                'password' => $password,
            ],
        ];
    }
}
