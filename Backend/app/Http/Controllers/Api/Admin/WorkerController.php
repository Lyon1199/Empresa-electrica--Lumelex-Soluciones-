<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class WorkerController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => User::query()
                ->whereHas('roles', fn ($roles) => $roles->whereIn('slug', ['tecnico', 'lider_proyecto'])->where('active', true))
                ->with(['roles' => fn ($roles) => $roles->whereIn('slug', ['tecnico', 'lider_proyecto'])->where('active', true)])
                ->withCount('assignedWorkOrders')
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'phone', 'daily_rate', 'identification', 'created_at'])
                ->map(fn (User $user) => [
                    ...$user->only(['id', 'name', 'email', 'phone', 'daily_rate', 'identification', 'created_at', 'assigned_work_orders_count']),
                    'role' => $user->roles->first()?->slug,
                ]),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['bail', 'required', 'string', 'max:254', 'email:rfc', 'unique:users,email'],
            'identification' => ['required', 'digits:10', 'unique:users,identification'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'daily_rate' => ['sometimes', 'numeric', 'min:0', 'max:99999999.99'],
            'role' => ['sometimes', Rule::in(['tecnico', 'lider_proyecto'])],
        ]);
        $data['password'] = $data['identification'];

        $roleSlug = $data['role'] ?? 'tecnico';
        $roleNames = [
            'tecnico' => ['Técnico', 'Ejecución de trabajos técnicos.'],
            'lider_proyecto' => ['Líder de proyecto', 'Gestiona los avances y reportes de proyectos.'],
        ];
        $role = Role::updateOrCreate(
            ['slug' => $roleSlug],
            [
                'name' => $roleNames[$roleSlug][0],
                'description' => $roleNames[$roleSlug][1],
                'active' => true,
            ]
        );
        $worker = DB::transaction(function () use ($data, $role) {
            $worker = User::create($data);
            $worker->roles()->sync([$role->id]);

            return $worker;
        });

        return response()->json([
            'message' => 'Cuenta de trabajador creada.',
            'data' => [
                ...$worker->only(['id', 'name', 'email', 'phone', 'identification', 'created_at']),
                'daily_rate' => $worker->daily_rate,
                'role' => $role->slug,
            ],
        ], 201);
    }

    public function update(Request $request, User $worker)
    {
        abort_unless($worker->hasRole('tecnico') || $worker->hasRole('lider_proyecto'), 404);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'bail', 'required', 'string', 'max:254', 'email:rfc', Rule::unique('users', 'email')->ignore($worker->id)],
            'identification' => ['sometimes', 'required', 'digits:10', Rule::unique('users', 'identification')->ignore($worker->id)],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'daily_rate' => ['sometimes', 'numeric', 'min:0', 'max:99999999.99'],
            'role' => ['sometimes', Rule::in(['tecnico', 'lider_proyecto'])],
        ]);
        if (array_key_exists('identification', $data)) {
            $data['password'] = $data['identification'];
        }

        $roleSlug = $data['role'] ?? null;
        unset($data['role']);
        $worker->update($data);
        if ($roleSlug) {
            $role = Role::where('slug', $roleSlug)->where('active', true)->firstOrFail();
            $worker->roles()->sync([$role->id]);
            DB::table('work_order_user')
                ->where('user_id', $worker->id)
                ->update(['assignment_type' => $roleSlug]);
        }

        return response()->json([
            'message' => 'Cuenta de trabajador actualizada.',
            'data' => [
                ...$worker->only(['id', 'name', 'email', 'phone', 'identification', 'created_at']),
                'daily_rate' => $worker->daily_rate,
                'role' => $roleSlug ?? ($worker->hasRole('lider_proyecto') ? 'lider_proyecto' : 'tecnico'),
            ],
        ]);
    }

    public function updateDailyRate(Request $request, User $worker)
    {
        abort_unless($worker->hasRole('tecnico') || $worker->hasRole('lider_proyecto'), 404);

        $data = $request->validate([
            'daily_rate' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
        ]);

        $worker->update($data);

        return response()->json([
            'message' => 'Pago diario actualizado.',
            'data' => [
                'id' => $worker->id,
                'daily_rate' => $worker->daily_rate,
            ],
        ]);
    }
}
