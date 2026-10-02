<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Admin\MailSettingsController;
use App\Http\Requests\StoreQuotationRequest;
use App\Http\Requests\UpdateQuotationRequest;
use App\Models\Customer;
use App\Models\InventoryProduct;
use App\Models\Quotation;
use App\Models\MailSetting;
use App\Mail\QuotationSent;
use App\Services\CustomerPortalProvisioner;
use App\Services\MicrosoftGraphMailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

class QuotationController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:150'],
            'status' => [
                'sometimes',
                'required',
                'in:draft,sent,accepted,rejected,expired,cancelled',
            ],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Quotation::query()
            ->select([
                'id',
                'number',
                'customer_id',
                'customer_name',
                'customer_identification',
                'customer_email',
                'customer_address',
                'title',
                'issue_date',
                'valid_until',
                'status',
                'scope',
                'notes',
                'terms',
                'currency',
                'subtotal',
                'discount_percent',
                'discount_amount',
                'tax_percent',
                'tax_amount',
                'total',
                'created_by',
                'created_at',
                'updated_at',
            ])
            ->with('items');

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($query) use ($search) {
                $query->where('number', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_identification', 'like', "%{$search}%");
            });
        }

        return response()->json(
            $query->orderByDesc('issue_date')
                ->orderByDesc('id')
                ->paginate($filters['per_page'] ?? 15)
        );
    }

    public function store(
        StoreQuotationRequest $request,
        CustomerPortalProvisioner $portalProvisioner
    ) {
        $result = DB::transaction(function () use ($request, $portalProvisioner) {
            $data = $request->validated();
            $customer = Customer::findOrFail($data['customer_id']);
            $quotation = new Quotation(
                $this->quotationAttributes($data, $customer)
            );
            $quotation->created_by = $request->user()?->id;
            $quotation->save();
            $quotation->number = sprintf(
                'COT-%s-%05d',
                now()->format('Y'),
                $quotation->id
            );
            $quotation->save();

            $this->replaceItemsAndTotals($quotation, $data);

            $provisioned = $quotation->status === 'accepted'
                ? $portalProvisioner->provision($quotation, $request->user()?->id)
                : ['project' => null, 'credentials' => null];

            return [
                'quotation' => $quotation,
                'project' => $provisioned['project'],
                'portal_credentials' => $provisioned['credentials'],
            ];
        });

        return response()->json([
            'message' => 'Cotización creada correctamente.',
            'data' => $result['quotation']->load('items', 'creator'),
            'project' => $result['project'],
            'portal_credentials' => $result['portal_credentials'],
        ], 201);
    }

    public function show(Quotation $quotation)
    {
        return response()->json([
            'data' => $quotation->load('items', 'creator'),
        ]);
    }

    public function send(Request $request, Quotation $quotation)
    {
        $request->validate([
            'pdf' => ['required', 'file', 'mimes:pdf', 'max:10240'],
        ]);

        if ($quotation->status !== 'draft') {
            return response()->json([
                'message' => 'Solo se pueden enviar cotizaciones que estén en borrador.',
            ], 422);
        }

        if (! $quotation->customer_email || ! filter_var($quotation->customer_email, FILTER_VALIDATE_EMAIL)) {
            return response()->json([
                'message' => 'El cliente no tiene un correo electrónico válido. Actualiza sus datos antes de enviar la cotización.',
            ], 422);
        }

        $mailSettings = MailSetting::query()->find(1);
        if (! $mailSettings) {
            return response()->json([
                'message' => 'El correo saliente no está configurado. Abre Administración → Correo saliente, guarda los datos SMTP y envía una prueba.',
            ], 503);
        }

        $quotation->loadMissing('items');
        $pdf = $request->file('pdf');
        $fileName = 'Cotizacion-'.$quotation->number.'.pdf';

        try {
            $mailable = (new QuotationSent($quotation, $pdf->get(), $fileName))
                ->from($mailSettings->from_address, $mailSettings->from_name);

            if ($mailSettings->provider === 'microsoft') {
                app(MicrosoftGraphMailService::class)->send(
                    $mailSettings,
                    $quotation->customer_email,
                    $mailable->envelope()->subject,
                    $mailable->render(),
                    'HTML',
                    [
                        'name' => $fileName,
                        'content_type' => 'application/pdf',
                        'content' => $pdf->get(),
                    ],
                );
            } else {
                app(MailSettingsController::class)->configureMailer($mailSettings);
                Mail::mailer('configured-smtp')->to($quotation->customer_email)->send($mailable);
            }
        } catch (Throwable $exception) {
            Log::error('No se pudo enviar la cotización por correo.', [
                'quotation_id' => $quotation->id,
                'exception' => $exception::class,
            ]);

            return response()->json([
                'message' => $mailSettings->provider === 'microsoft'
                    ? 'No se pudo enviar el correo con Microsoft. Revisa que la cuenta siga conectada y que tenga permiso para enviar correos.'
                    : 'No se pudo enviar el correo. Verifica los datos SMTP en Administración → Correo saliente y envía una prueba.',
            ], 502);
        } finally {
            Mail::purge('configured-smtp');
        }

        $quotation->update([
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        return response()->json([
            'message' => 'Cotización enviada por correo a '.$quotation->customer_email.'.',
            'data' => $quotation->fresh()->load('items', 'creator'),
        ]);
    }

    public function clone(Request $request, Quotation $quotation)
    {
        $data = $request->validate([
            'customer_id' => [
                'required',
                'integer',
                Rule::exists('customers', 'id')->where('active', true),
            ],
        ]);

        $customer = Customer::findOrFail($data['customer_id']);
        $copy = DB::transaction(function () use ($quotation, $customer, $request) {
            $copy = $quotation->replicate([
                'id',
                'number',
                'created_at',
                'updated_at',
                'status',
                'customer_id',
                'customer_name',
                'customer_identification',
                'customer_email',
                'customer_address',
                'created_by',
                'subtotal',
                'discount_amount',
                'tax_amount',
                'total',
            ]);
            $copy->customer_id = $customer->id;
            $copy->customer_name = $customer->name;
            $copy->customer_identification = $customer->identification;
            $copy->customer_email = $customer->email;
            $copy->customer_address = $customer->address;
            $copy->status = 'draft';
            $copy->created_by = $request->user()?->id;
            $copy->save();
            $copy->number = sprintf('COT-%s-%05d', now()->format('Y'), $copy->id);
            $copy->save();

            $items = $quotation->items()->get()->map(fn ($item) => $item->only([
                'product_id',
                'category',
                'description',
                'unit',
                'quantity',
                'unit_price',
                'line_total',
                'position',
            ]))->all();
            $copy->items()->createMany($items);
            $copy->update([
                'subtotal' => $quotation->subtotal,
                'discount_percent' => $quotation->discount_percent,
                'discount_amount' => $quotation->discount_amount,
                'tax_percent' => $quotation->tax_percent,
                'tax_amount' => $quotation->tax_amount,
                'total' => $quotation->total,
            ]);

            return $copy->load('items', 'creator');
        });

        return response()->json([
            'message' => 'Cotización clonada como borrador.',
            'data' => $copy,
        ], 201);
    }

    public function update(
        UpdateQuotationRequest $request,
        Quotation $quotation,
        CustomerPortalProvisioner $portalProvisioner
    ) {
        $result = DB::transaction(function () use ($request, $quotation, $portalProvisioner) {
            $quotation = Quotation::query()
                ->lockForUpdate()
                ->findOrFail($quotation->id);
            $data = $request->validated();

            if ($quotation->project()->exists() && $data['status'] !== 'accepted') {
                abort(422, 'Una cotización convertida en proyecto no puede salir del estado aceptado.');
            }
            if ($quotation->status !== 'sent' && $data['status'] === 'sent') {
                abort(422, 'Usa la acción de enviar cotización por correo para marcarla como enviada.');
            }

            $customer = Customer::findOrFail($data['customer_id']);

            $quotation->update(
                $this->quotationAttributes($data, $customer)
            );
            $this->replaceItemsAndTotals($quotation, $data);

            $provisioned = $quotation->status === 'accepted'
                ? $portalProvisioner->provision($quotation, $request->user()?->id)
                : ['project' => null, 'credentials' => null];

            return [
                'quotation' => $quotation->load('items', 'creator'),
                'project' => $provisioned['project'],
                'portal_credentials' => $provisioned['credentials'],
            ];
        });

        return response()->json([
            'message' => 'Cotización actualizada correctamente.',
            'data' => $result['quotation'],
            'project' => $result['project'],
            'portal_credentials' => $result['portal_credentials'],
        ]);
    }

    public function destroy(Quotation $quotation)
    {
        if (! in_array($quotation->status, ['draft', 'rejected', 'cancelled'], true)) {
            return response()->json([
                'message' => 'Solo se pueden eliminar cotizaciones en borrador, rechazadas o canceladas.',
            ], 422);
        }

        $quotation->delete();

        return response()->json([
            'message' => 'Cotización eliminada correctamente.',
        ]);
    }

    private function quotationAttributes(array $data, Customer $customer): array
    {
        $internalLaborEnabled = (bool) ($data['internal_labor_enabled'] ?? false);

        return [
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_identification' => $customer->identification,
            'customer_email' => $customer->email,
            'customer_address' => $customer->address,
            'title' => $data['title'],
            'issue_date' => $data['issue_date'],
            'valid_until' => $data['valid_until'],
            'status' => $data['status'] ?? 'draft',
            'scope' => $data['scope'] ?? null,
            'notes' => $data['notes'] ?? null,
            'terms' => $data['terms'] ?? null,
            'currency' => 'USD',
            'internal_labor_enabled' => $internalLaborEnabled,
            'internal_worker_count' => $internalLaborEnabled
                ? $data['internal_worker_count']
                : 0,
            'internal_work_days' => $internalLaborEnabled
                ? $data['internal_work_days']
                : 0,
            'internal_daily_rate' => $internalLaborEnabled
                ? $data['internal_daily_rate']
                : 0,
        ];
    }

    private function replaceItemsAndTotals(Quotation $quotation, array $data): void
    {
        $quotation->items()->delete();

        $subtotal = 0;
        $items = [];

        foreach ($data['items'] as $position => $item) {
            if (! empty($item['product_id'])) {
                $product = InventoryProduct::query()
                    ->where('active', true)
                    ->findOrFail($item['product_id']);
                $item = array_merge([
                    'category' => 'material',
                    'description' => $product->description,
                    'unit' => $product->unit,
                    'unit_price' => $product->unit_price,
                ], $item);
            }

            $lineTotal = round(
                (float) $item['quantity'] * (float) $item['unit_price'],
                2
            );
            $subtotal += $lineTotal;
            $items[] = [
                ...$item,
                'line_total' => $lineTotal,
                'position' => $position,
            ];
        }

        $internalLaborTotal = ! empty($data['internal_labor_enabled'])
            ? round(
                (int) $data['internal_worker_count']
                * (float) $data['internal_work_days']
                * (float) $data['internal_daily_rate'],
                2
            )
            : 0;
        $subtotal = round($subtotal + $internalLaborTotal, 2);
        $discountPercent = (float) $data['discount_percent'];
        $discountAmount = round($subtotal * $discountPercent / 100, 2);
        $taxableAmount = max(0, $subtotal - $discountAmount);
        $taxPercent = (float) $data['tax_percent'];
        $taxAmount = round($taxableAmount * $taxPercent / 100, 2);

        $quotation->items()->createMany($items);
        $quotation->update([
            'subtotal' => $subtotal,
            'discount_percent' => $discountPercent,
            'discount_amount' => $discountAmount,
            'tax_percent' => $taxPercent,
            'tax_amount' => $taxAmount,
            'internal_labor_total' => $internalLaborTotal,
            'total' => round($taxableAmount + $taxAmount, 2),
        ]);
    }
}
