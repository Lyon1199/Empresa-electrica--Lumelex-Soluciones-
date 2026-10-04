<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\FinancialTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FinanceController extends Controller
{
    public function summary()
    {
        $monthStart = now()->startOfMonth();
        $monthEnd = now()->endOfMonth();

        $transactions = FinancialTransaction::query();

        return response()->json([
            'data' => [
                'receivables_pending' => (float) (clone $transactions)
                    ->where('type', 'receivable')
                    ->where('status', 'pending')
                    ->sum('amount'),
                'payables_pending' => (float) (clone $transactions)
                    ->whereIn('type', ['payable', 'expense'])
                    ->where('status', 'pending')
                    ->sum('amount'),
                'collected_this_month' => (float) (clone $transactions)
                    ->where('type', 'receivable')
                    ->where('status', 'paid')
                    ->whereBetween('paid_at', [$monthStart, $monthEnd])
                    ->sum('amount'),
                'paid_out_this_month' => (float) (clone $transactions)
                    ->whereIn('type', ['payable', 'expense'])
                    ->where('status', 'paid')
                    ->whereBetween('paid_at', [$monthStart, $monthEnd])
                    ->sum('amount'),
            ],
        ]);
    }

    public function index(Request $request)
    {
        $filters = $request->validate([
            'type' => ['nullable', Rule::in(['receivable', 'payable', 'expense'])],
            'status' => ['nullable', Rule::in(['pending', 'paid', 'cancelled'])],
        ]);

        $transactions = FinancialTransaction::query()
            ->with(['project:id,title', 'recorder:id,name'])
            ->when($filters['type'] ?? null, fn ($query, $type) => $query->where('type', $type))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->orderByDesc('issue_date')
            ->orderByDesc('id')
            ->paginate(50);

        return response()->json(['data' => $transactions]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['receivable', 'payable', 'expense'])],
            'description' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'counterparty' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:999999999999.99'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:issue_date'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
        ]);

        $transaction = FinancialTransaction::create([
            ...$data,
            'status' => 'pending',
            'recorded_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => $transaction->load(['project:id,title', 'recorder:id,name']),
        ], 201);
    }

    public function updateStatus(Request $request, FinancialTransaction $transaction)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['paid', 'cancelled'])],
            'payment_method' => [
                Rule::requiredIf($request->input('status') === 'paid'),
                'nullable',
                Rule::in(['cash', 'bank_transfer', 'card', 'other']),
            ],
        ]);

        $updated = DB::transaction(function () use ($transaction, $data) {
            $lockedTransaction = FinancialTransaction::query()
                ->lockForUpdate()
                ->findOrFail($transaction->id);

            if ($lockedTransaction->status !== 'pending') {
                return false;
            }

            $lockedTransaction->update([
                'status' => $data['status'],
                'payment_method' => $data['status'] === 'paid' ? $data['payment_method'] : null,
                'paid_at' => $data['status'] === 'paid' ? now() : null,
            ]);

            return true;
        });

        if (! $updated) {
            return response()->json([
                'message' => 'Solo se pueden pagar o cancelar movimientos pendientes.',
            ], 422);
        }

        return response()->json([
            'data' => $transaction->fresh()->load(['project:id,title', 'recorder:id,name']),
        ]);
    }
}
