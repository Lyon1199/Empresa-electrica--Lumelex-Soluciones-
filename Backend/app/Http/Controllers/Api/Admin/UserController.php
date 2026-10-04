<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    private const CATEGORIES = [
        'admins' => ['admin'],
        'workers' => ['tecnico', 'lider_proyecto'],
        'customers' => ['cliente'],
        'staff' => ['gerente', 'contabilidad', 'bodega', 'supervisor'],
    ];

    public function index(Request $request)
    {
        $filters = $request->validate([
            'category' => ['sometimes', Rule::in(['all', ...array_keys(self::CATEGORIES), 'unassigned'])],
            'role' => ['sometimes', 'nullable', 'string', 'max:80'],
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:10', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $query = User::query()
            ->select(['id', 'customer_id', 'name', 'email', 'phone', 'identification', 'created_at'])
            ->with([
                'roles' => fn ($roles) => $roles
                    ->where('active', true)
                    ->orderBy('name')
                    ->select(['roles.id', 'roles.name', 'roles.slug']),
                'customer:id,name,phone,contact_phone',
            ]);

        $category = $filters['category'] ?? 'all';
        if ($category === 'unassigned') {
            $query->whereDoesntHave('roles', fn ($roles) => $roles->where('active', true));
        } elseif (isset(self::CATEGORIES[$category])) {
            $this->filterRoles($query, self::CATEGORIES[$category]);
        }

        if (! empty($filters['role'])) {
            $this->filterRoles($query, [$filters['role']]);
        }

        if (! empty($filters['search'])) {
            $search = trim($filters['search']);
            $query->where(function ($users) use ($search) {
                $users->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('identification', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($customers) => $customers
                        ->where('phone', 'like', "%{$search}%")
                        ->orWhere('contact_phone', 'like', "%{$search}%"));
            });
        }

        $users = $query
            ->orderBy('name')
            ->paginate($filters['per_page'] ?? 20);

        return response()->json([
            'data' => $users->getCollection()->map(fn (User $user) => [
                ...$user->only(['id', 'customer_id', 'name', 'email', 'identification', 'created_at']),
                'phone' => $user->customer?->phone
                    ?: $user->customer?->contact_phone
                    ?: $user->phone,
                'roles' => $user->roles->map(fn (Role $role) => [
                    'name' => $role->name,
                    'slug' => $role->slug,
                ])->values(),
                'customer' => $user->customer?->only(['id', 'name', 'phone', 'contact_phone']),
            ])->values(),
            'roles' => Role::query()
                ->where('active', true)
                ->orderBy('name')
                ->get(['name', 'slug']),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function updateRole(Request $request, User $user)
    {
        if ($request->user()->is($user)) {
            return response()->json([
                'message' => 'No puedes cambiar tu propio rol desde esta pantalla.',
            ], 422);
        }

        $data = $request->validate([
            'role' => ['required', 'string', Rule::exists('roles', 'slug')->where('active', true)],
        ]);

        $updated = DB::transaction(function () use ($data, $user) {
            $adminRole = Role::query()
                ->where('slug', 'admin')
                ->lockForUpdate()
                ->firstOrFail();

            $target = User::query()
                ->with(['roles' => fn ($roles) => $roles->where('active', true)])
                ->lockForUpdate()
                ->findOrFail($user->id);
            $wasAdmin = $target->roles->contains('slug', 'admin');

            if ($wasAdmin && $data['role'] !== 'admin') {
                $adminCount = User::query()
                    ->whereHas('roles', fn ($roles) => $roles
                        ->where('roles.id', $adminRole->id)
                        ->where('roles.active', true))
                    ->count();

                if ($adminCount <= 1) {
                    return false;
                }
            }

            $role = Role::query()
                ->where('slug', $data['role'])
                ->where('active', true)
                ->firstOrFail();
            $target->roles()->sync([$role->id]);

            if (in_array($data['role'], ['tecnico', 'lider_proyecto'], true)) {
                DB::table('work_order_user')
                    ->where('user_id', $target->id)
                    ->update(['assignment_type' => $data['role']]);
            }

            return true;
        });

        if (! $updated) {
            return response()->json([
                'message' => 'No se puede cambiar el rol del último administrador activo.',
            ], 422);
        }

        return response()->json([
            'message' => 'Rol actualizado correctamente.',
            'data' => [
                'id' => $user->id,
                'role' => $data['role'],
            ],
        ]);
    }

    private function filterRoles($query, array $slugs): void
    {
        $query->whereHas('roles', fn ($roles) => $roles
            ->where('roles.active', true)
            ->whereIn('roles.slug', $slugs));
    }
}
