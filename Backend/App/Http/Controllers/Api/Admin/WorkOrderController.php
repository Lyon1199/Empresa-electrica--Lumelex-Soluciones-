<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WorkOrderController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:150'],
            'status' => ['sometimes', Rule::in(['pending', 'in_progress', 'on_hold', 'completed', 'cancelled'])],
            'worker_id' => ['sometimes', 'integer', 'exists:users,id'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = WorkOrder::query()
            ->with([
                'project.customer:id,name,identification,email,phone,address',
                'project.quotation:id,number,title,total,status,internal_labor_total',
                'workers:id,name,email,phone',
                'leaders:id,name,email,phone',
            ])
            ->with(['dailyReports' => fn ($reports) => $reports
                ->with('worker:id,name')
                ->latest('submitted_at')
                ->limit(1)])
            ->withCount('dailyReports');

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['worker_id'])) {
            $query->where(function ($orders) use ($filters) {
                $orders->whereHas('workers', fn ($workers) => $workers->where('users.id', $filters['worker_id']))
                    ->orWhereHas('leaders', fn ($leaders) => $leaders->where('users.id', $filters['worker_id']));
            });
        }

        if (! empty($filters['search'])) {
            $search = mb_strtolower($filters['search']);
            $query->where(function ($orders) use ($search) {
                $orders->whereRaw('LOWER(number) LIKE ?', ["%{$search}%"])
                    ->orWhereHas('project', function ($projects) use ($search) {
                        $projects->whereRaw('LOWER(title) LIKE ?', ["%{$search}%"])
                            ->orWhereHas('customer', fn ($customers) => $customers
                                ->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"]));
                    });
            });
        }

        $orders = $query->orderByDesc('created_at')->paginate($filters['per_page'] ?? 20);
        $orders->getCollection()->each(function (WorkOrder $order) {
            $order->setAttribute('latest_reports', $order->dailyReports);
            $order->unsetRelation('dailyReports');
        });

        return response()->json($orders);
    }

    public function show(WorkOrder $workOrder)
    {
        $workOrder = $workOrder->load([
            'project.customer:id,name,identification,email,phone,address',
            'project.quotation:id,number,title,total,status,internal_labor_total',
            'workers:id,name,email,phone',
            'leaders:id,name,email,phone',
            'dailyReports' => fn ($reports) => $reports
                ->with('worker:id,name,email')
                ->orderByDesc('report_date')
                ->orderByDesc('submitted_at'),
        ]);
        $workOrder->setAttribute('latest_reports', $workOrder->dailyReports);
        $workOrder->unsetRelation('dailyReports');

        return response()->json([
            'data' => $workOrder,
        ]);
    }

    public function update(Request $request, WorkOrder $workOrder)
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['pending', 'in_progress', 'on_hold', 'completed', 'cancelled'])],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'worker_ids' => ['sometimes', 'array'],
            'worker_ids.*' => ['integer', 'distinct', 'exists:users,id'],
            'leader_ids' => ['sometimes', 'array'],
            'leader_ids.*' => ['integer', 'distinct', 'exists:users,id'],
        ]);

        if (array_key_exists('worker_ids', $data)) {
            $invalidWorkers = collect($data['worker_ids'])->filter(function ($id) {
                return ! User::whereKey($id)->whereHas(
                    'roles',
                    fn ($roles) => $roles->where('slug', 'tecnico')->where('active', true)
                )->exists();
            });

            if ($invalidWorkers->isNotEmpty()) {
                return response()->json(['message' => 'Solo se pueden asignar cuentas de trabajadores.'], 422);
            }
        }
        if (array_key_exists('leader_ids', $data)) {
            $invalidLeaders = collect($data['leader_ids'])->filter(fn ($id) => ! User::whereKey($id)
                ->whereHas('roles', fn ($roles) => $roles->where('slug', 'lider_proyecto')->where('active', true))
                ->exists());
            if ($invalidLeaders->isNotEmpty()) {
                return response()->json(['message' => 'Solo se pueden asignar cuentas de líderes de proyecto.'], 422);
            }
        }

        if (isset($data['status']) || array_key_exists('description', $data)) {
            $workOrder->update(collect($data)->only(['status', 'description'])->all());
        }

        if (array_key_exists('worker_ids', $data)) {
            $workOrder->workers()->sync($data['worker_ids']);
        }
        if (array_key_exists('leader_ids', $data)) {
            $workOrder->leaders()->sync($data['leader_ids']);
        }

        return response()->json([
            'message' => 'Orden de trabajo actualizada.',
            'data' => $workOrder->fresh()->load([
                'project.customer:id,name,identification,email,phone,address',
                'project.quotation:id,number,title,total,status',
                'workers:id,name,email,phone',
                'leaders:id,name,email,phone',
            ]),
        ]);
    }
}
