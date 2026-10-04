<?php

namespace App\Http\Controllers\Api\Worker;

use App\Http\Controllers\Controller;
use App\Models\DailyReport;
use App\Models\WorkOrder;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DailyReportController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'month' => ['sometimes', 'date_format:Y-m'],
        ]);
        $month = $filters['month'] ?? now()->format('Y-m');

        return response()->json([
            'data' => $request->user()
                ->dailyReports()
                ->with(['workOrder:id,number,project_id', 'workOrder.project:id,title'])
                ->whereBetween('report_date', [
                    $month.'-01',
                    Carbon::createFromFormat('Y-m', $month, config('app.timezone'))->endOfMonth()->toDateString(),
                ])
                ->orderByDesc('report_date')
                ->orderByDesc('submitted_at')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'work_order_id' => ['required', 'integer', 'exists:work_orders,id'],
            'report_date' => ['required', 'date_format:Y-m-d', Rule::in([now()->toDateString()])],
            'work_done' => ['required', 'string', 'min:3', 'max:10000'],
            'location' => ['required', 'string', 'max:255'],
            'hours_worked' => ['sometimes', 'nullable', 'numeric', 'between:0,24'],
            'start_time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'end_time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'materials_used' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'issues' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        $worker = $request->user();
        $assignmentRelation = $worker->hasRole('lider_proyecto') ? 'leaders' : 'workers';
        $workOrder = WorkOrder::query()
            ->whereKey($data['work_order_id'])
            ->whereIn('status', ['pending', 'in_progress'])
            ->whereHas($assignmentRelation, fn ($query) => $query->where('users.id', $worker->id))
            ->first();

        if (! $workOrder) {
            return response()->json(['message' => 'La orden no está asignada a este trabajador o no está activa.'], 403);
        }

        if (DailyReport::where('work_order_id', $workOrder->id)
            ->where('worker_id', $worker->id)
            ->whereDate('report_date', $data['report_date'])
            ->exists()) {
            return response()->json(['message' => 'Ya existe un reporte para esta orden y fecha.'], 422);
        }

        $report = DailyReport::create([
            ...$data,
            'worker_id' => $worker->id,
            'submitted_at' => now(),
        ]);

        return response()->json([
            'message' => 'Reporte diario enviado.',
            'data' => $report->load(['worker:id,name', 'workOrder:id,number,project_id']),
        ], 201);
    }
}
