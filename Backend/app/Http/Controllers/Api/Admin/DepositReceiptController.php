<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DepositReceipt;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class DepositReceiptController extends Controller
{
    public function store(Request $request, Project $project)
    {
        abort_unless(
            (int) $project->customer_id === (int) $request->user()->customer_id,
            404
        );

        $data = $request->validate([
            'receipt' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
            'amount' => ['nullable', 'numeric', 'gt:0', 'max:1000000000'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $file = $data['receipt'];
        $path = 'deposit-receipts/'.$project->id.'/'.Str::uuid().'.'.$file->extension();

        if (! Storage::disk('local')->put($path, file_get_contents($file->getRealPath()))) {
            throw new RuntimeException('No se pudo almacenar el comprobante de depósito.');
        }

        try {
            $receipt = DB::transaction(fn () => $project->depositReceipts()->create([
                'uploaded_by' => $request->user()->id,
                'disk' => 'local',
                'path' => $path,
                'original_name' => Str::limit(basename($file->getClientOriginalName()), 255, ''),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
                'amount' => $data['amount'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => 'pending',
            ]));
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json([
            'message' => 'Comprobante enviado correctamente. Contabilidad lo revisará.',
            'data' => $receipt->load('uploader:id,name,email'),
        ], 201);
    }

    public function index(Request $request)
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::in(['pending', 'approved', 'rejected'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = DepositReceipt::query()
            ->with([
                'project:id,number,title,customer_id',
                'project.customer:id,name,identification',
                'uploader:id,name,email',
                'reviewer:id,name',
            ]);

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return response()->json($query->latest()->paginate($filters['per_page'] ?? 20));
    }

    public function download(Request $request, DepositReceipt $receipt): StreamedResponse
    {
        $user = $request->user();
        $isProjectCustomer = $user->hasRole('cliente')
            && (int) $user->customer_id === (int) $receipt->project->customer_id;
        $isFinanceOrAdmin = $user->roles()
            ->where('roles.active', true)
            ->whereIn('roles.slug', ['admin', 'gerente', 'contabilidad'])
            ->exists();

        abort_unless($isProjectCustomer || $isFinanceOrAdmin, 404);

        abort_unless(
            Storage::disk($receipt->disk)->exists($receipt->path),
            404,
            'El comprobante no está disponible.'
        );

        return Storage::disk($receipt->disk)->download(
            $receipt->path,
            $receipt->original_name,
            ['Content-Type' => $receipt->mime_type]
        );
    }

    public function review(Request $request, DepositReceipt $receipt)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
            'review_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $receipt->update([
            'status' => $data['status'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_notes' => $data['review_notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Revisión del comprobante guardada.',
            'data' => $receipt->fresh()->load('uploader:id,name,email', 'reviewer:id,name'),
        ]);
    }
}
