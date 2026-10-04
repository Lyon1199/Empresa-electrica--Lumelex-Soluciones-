<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DailyReport;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkerPayrollPayment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DailyReportController extends Controller
{
    public function index(Request $request)
    {
        $filters = $this->filters($request);
        $reports = $this->reportQuery($filters)->orderByDesc('report_date')->orderByDesc('submitted_at')->get();
        $overdueDays = $this->overdueDays($filters);

        return response()->json([
            'data' => $reports,
            'summary' => [
                'submitted' => $reports->count(),
                'overdue' => count($overdueDays),
                'workers' => $reports->groupBy('worker_id')->map(fn ($items) => [
                    'worker' => $items->first()->worker,
                    'submitted' => $items->count(),
                ])->values(),
                'payroll' => $this->payrollSummary($filters),
                'overdue_days' => $overdueDays,
            ],
        ]);
    }

    public function overview(Request $request)
    {
        $filters = $this->filters($request);
        $reports = $this->reportQuery($filters)->get();
        $overdueDays = $this->overdueDays($filters);

        $assignments = WorkOrder::query()
            ->where(function ($query) use ($filters) {
                $query->whereHas('workers', fn ($workers) => $workers->when(
                    $filters['worker_id'],
                    fn ($workers, $id) => $workers->where('users.id', $id)
                ))->orWhereHas('leaders', fn ($leaders) => $leaders->when(
                    $filters['worker_id'],
                    fn ($leaders, $id) => $leaders->where('users.id', $id)
                ));
            })
            ->when($filters['work_order_id'], fn ($query, $id) => $query->whereKey($id))
            ->with([
                'workers' => fn ($query) => $query
                    ->select('users.id', 'name', 'email', 'phone')
                    ->when($filters['worker_id'], fn ($workers, $id) => $workers->where('users.id', $id)),
                'leaders' => fn ($query) => $query
                    ->select('users.id', 'name', 'email', 'phone')
                    ->when($filters['worker_id'], fn ($leaders, $id) => $leaders->where('users.id', $id)),
                'project:id,title',
            ])
            ->get();

        $workerStats = $assignments->flatMap(function (WorkOrder $order) {
            return $order->workers->merge($order->leaders)
                ->map(fn (User $worker) => ['worker' => $worker, 'work_order_id' => $order->id]);
        })->groupBy(fn ($assignment) => $assignment['worker']->id)->map(function ($items) use ($reports) {
            $workerId = $items->first()['worker']->id;
            $workerReports = $reports->where('worker_id', $workerId);

            return [
                'worker' => $items->first()['worker'],
                'submitted' => $workerReports->count(),
                'hours_worked' => (float) $workerReports->sum('hours_worked'),
            ];
        })->values();

        $orderStats = $assignments->map(function (WorkOrder $order) use ($reports) {
            $orderReports = $reports->where('work_order_id', $order->id);

            return [
                'work_order' => $order,
                'submitted' => $orderReports->count(),
                'hours_worked' => (float) $orderReports->sum('hours_worked'),
            ];
        })->values();

        return response()->json([
            'month' => $filters['month'],
            'summary' => [
                'submitted' => $reports->count(),
                'overdue' => count($overdueDays),
                'workers' => $workerStats,
                'work_orders' => $orderStats,
            ],
        ]);
    }

    public function export(Request $request)
    {
        $filters = $this->filters($request);
        abort_unless($request->filled('worker_id'), 422, 'Indique un trabajador para exportar su reporte mensual.');

        $reports = $this->reportQuery($filters)
            ->orderBy('report_date')
            ->orderBy('submitted_at')
            ->get();
        $worker = User::findOrFail($filters['worker_id']);
        $filename = 'reporte-trabajador-'.$worker->id.'-'.$filters['month'].'.csv';

        return response()->streamDownload(function () use ($reports) {
            $output = fopen('php://output', 'w');
            fputcsv($output, ['Fecha', 'Orden de trabajo', 'Trabajador', 'Trabajo realizado', 'Ubicación', 'Horas', 'Inicio', 'Fin', 'Materiales', 'Incidencias', 'Notas', 'Enviado el']);
            foreach ($reports as $report) {
                fputcsv($output, [
                    $report->report_date->format('Y-m-d'),
                    $report->workOrder->number,
                    $report->worker->name,
                    $report->work_done,
                    $report->location,
                    $report->hours_worked,
                    $report->start_time,
                    $report->end_time,
                    $report->materials_used,
                    $report->issues,
                    $report->notes,
                    $report->submitted_at->toIso8601String(),
                ]);
            }
            fclose($output);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function storePayment(Request $request)
    {
        $data = $request->validate([
            'worker_id' => ['required', 'integer', 'exists:users,id'],
            'month' => ['required', 'date_format:Y-m'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:99999999.99'],
            'payment_date' => ['sometimes', 'date_format:Y-m-d'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $payment = DB::transaction(function () use ($data, $request) {
            $worker = User::query()->lockForUpdate()->findOrFail($data['worker_id']);
            if (! $worker->hasRole('tecnico') && ! $worker->hasRole('lider_proyecto')) {
                throw ValidationException::withMessages([
                    'worker_id' => 'El usuario seleccionado no es un trabajador.',
                ]);
            }

            [$start, $end] = $this->monthRange($data['month']);
            $workedDays = DailyReport::query()
                ->where('worker_id', $worker->id)
                ->whereBetween('report_date', [$start->toDateString(), $end->toDateString()])
                ->distinct()
                ->count('report_date');

            $payments = WorkerPayrollPayment::query()
                ->where('worker_id', $worker->id)
                ->where('month', $data['month'])
                ->orderBy('id')
                ->lockForUpdate()
                ->get(['amount', 'daily_rate']);
            $dailyRate = (float) ($payments->first()?->daily_rate ?? $worker->daily_rate);
            $dueCents = (int) round($dailyRate * $workedDays * 100);
            $paidCents = (int) $payments->sum(fn (WorkerPayrollPayment $item) => (int) round((float) $item->amount * 100));
            $amountCents = (int) round((float) $data['amount'] * 100);

            if ($amountCents > $dueCents - $paidCents) {
                throw ValidationException::withMessages([
                    'amount' => 'El pago supera el saldo pendiente de '.number_format(max(0, ($dueCents - $paidCents) / 100), 2, '.', '').'.',
                ]);
            }

            return WorkerPayrollPayment::create([
                'worker_id' => $worker->id,
                'month' => $data['month'],
                'daily_rate' => number_format($dailyRate, 2, '.', ''),
                'amount' => number_format($amountCents / 100, 2, '.', ''),
                'payment_date' => $data['payment_date'] ?? now()->toDateString(),
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);
        });

        return response()->json([
            'message' => 'Pago registrado.',
            'data' => $payment->load('creator:id,name'),
        ], 201);
    }

    private function filters(Request $request): array
    {
        $validated = $request->validate([
            'month' => ['sometimes', 'date_format:Y-m'],
            'worker_id' => ['sometimes', 'integer', 'exists:users,id'],
            'work_order_id' => ['sometimes', 'integer', 'exists:work_orders,id'],
        ]);

        return [
            'month' => $validated['month'] ?? now()->format('Y-m'),
            'worker_id' => $validated['worker_id'] ?? null,
            'work_order_id' => $validated['work_order_id'] ?? null,
        ];
    }

    private function reportQuery(array $filters)
    {
        [$start, $end] = $this->monthRange($filters['month']);

        return DailyReport::query()
            ->with([
                'worker:id,name,email,phone',
                'workOrder:id,number,project_id,status',
                'workOrder.project:id,title,customer_id',
                'workOrder.project.customer:id,name',
            ])
            ->whereBetween('report_date', [$start->toDateString(), $end->toDateString()])
            ->when($filters['worker_id'], fn ($query, $id) => $query->where('worker_id', $id))
            ->when($filters['work_order_id'], fn ($query, $id) => $query->where('work_order_id', $id));
    }

    private function payrollSummary(array $filters): array
    {
        [$start, $end] = $this->monthRange($filters['month']);
        $daysByWorker = DB::table('daily_reports')
            ->whereBetween('report_date', [$start->toDateString(), $end->toDateString()])
            ->when($filters['worker_id'], fn ($query, $id) => $query->where('worker_id', $id))
            ->select('worker_id', DB::raw('COUNT(DISTINCT report_date) as worked_days'))
            ->groupBy('worker_id')
            ->get()
            ->keyBy('worker_id');

        $workers = User::query()
            ->whereIn('id', $daysByWorker->keys())
            ->orderBy('name')
            ->get(['id', 'name', 'daily_rate']);
        $payments = WorkerPayrollPayment::query()
            ->with('creator:id,name')
            ->where('month', $filters['month'])
            ->whereIn('worker_id', $workers->pluck('id'))
            ->orderBy('payment_date')
            ->orderBy('id')
            ->get()
            ->groupBy('worker_id');
        $payroll = $workers->map(function (User $worker) use ($daysByWorker, $payments) {
            $workedDays = (int) $daysByWorker[$worker->id]->worked_days;
            $workerPayments = $payments->get($worker->id, collect());
            $dailyRate = (float) ($workerPayments->first()?->daily_rate ?? $worker->daily_rate);
            $amountDue = round($dailyRate * $workedDays, 2);
            $paid = round($workerPayments->sum(fn (WorkerPayrollPayment $payment) => (float) $payment->amount), 2);
            $balance = round(max(0, $amountDue - $paid), 2);

            return [
                'worker' => $worker->only(['id', 'name']),
                'daily_rate' => $dailyRate,
                'worked_days' => $workedDays,
                'amount_due' => $amountDue,
                'paid' => $paid,
                'balance' => $balance,
                'status' => $balance === 0.0 ? 'paid' : ($paid > 0 ? 'partial' : 'pending'),
                'payments' => $workerPayments->values(),
            ];
        })->values();

        return [
            'workers' => $payroll,
            'total_due' => round($payroll->sum('amount_due'), 2),
            'total_paid' => round($payroll->sum('paid'), 2),
            'total_balance' => round($payroll->sum('balance'), 2),
        ];
    }

    private function overdueDays(array $filters): array
    {
        [$start, $monthEnd] = $this->monthRange($filters['month']);
        $lastElapsedDay = min($monthEnd->timestamp, now()->startOfDay()->timestamp);
        if ($lastElapsedDay < $start->timestamp) {
            return [];
        }

        $orders = WorkOrder::query()
            ->whereIn('status', ['pending', 'in_progress'])
            ->when($filters['work_order_id'], fn ($query, $id) => $query->whereKey($id))
            ->where(function ($query) use ($filters) {
                $query->whereHas('workers', fn ($workers) => $workers->when(
                    $filters['worker_id'],
                    fn ($workers, $id) => $workers->where('users.id', $id)
                ))->orWhereHas('leaders', fn ($leaders) => $leaders->when(
                    $filters['worker_id'],
                    fn ($leaders, $id) => $leaders->where('users.id', $id)
                ));
            })
            ->with([
                'workers' => fn ($query) => $query
                    ->select('users.id', 'name')
                    ->when($filters['worker_id'], fn ($workers, $id) => $workers->where('users.id', $id)),
                'leaders' => fn ($query) => $query
                    ->select('users.id', 'name')
                    ->when($filters['worker_id'], fn ($leaders, $id) => $leaders->where('users.id', $id)),
            ])
            ->get(['id', 'number', 'project_id']);

        $lastDay = Carbon::createFromTimestamp($lastElapsedDay, config('app.timezone'));
        $submittedKeys = DB::table('daily_reports')
            ->whereIn('work_order_id', $orders->pluck('id'))
            ->whereBetween('report_date', [$start->toDateString(), $lastDay->toDateString()])
            ->when($filters['worker_id'], fn ($query, $id) => $query->where('worker_id', $id))
            ->get(['work_order_id', 'worker_id', 'report_date'])
            ->mapWithKeys(fn ($report) => [
                $report->work_order_id.':'.$report->worker_id.':'.$report->report_date => true,
            ]);

        $days = [];
        $day = $start->copy();
        while ($day->lte($lastDay)) {
            foreach ($orders as $order) {
                foreach ($order->workers->merge($order->leaders) as $worker) {
                    $submitted = $submittedKeys->has($order->id.':'.$worker->id.':'.$day->toDateString());
                    if (! $submitted) {
                        $days[] = [
                            'report_date' => $day->toDateString(),
                            'worker_id' => $worker->id,
                            'worker_name' => $worker->name,
                            'work_order_id' => $order->id,
                            'work_order_number' => $order->number,
                            'worker' => ['id' => $worker->id, 'name' => $worker->name],
                            'work_order' => ['id' => $order->id, 'number' => $order->number],
                        ];
                    }
                }
            }
            $day->addDay();
        }

        return $days;
    }

    private function monthRange(string $month): array
    {
        $start = Carbon::createFromFormat('Y-m', $month, config('app.timezone'))->startOfMonth();

        return [$start, $start->copy()->endOfMonth()];
    }
}
