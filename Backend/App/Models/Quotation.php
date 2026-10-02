<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Quotation extends Model
{
    protected $fillable = [
        'customer_id',
        'customer_name',
        'customer_identification',
        'customer_email',
        'customer_address',
        'title',
        'issue_date',
        'valid_until',
        'status',
        'sent_at',
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
        'internal_labor_enabled',
        'internal_worker_count',
        'internal_work_days',
        'internal_daily_rate',
        'internal_labor_total',
        'created_by',
    ];

    protected $casts = [
        'issue_date' => 'date:Y-m-d',
        'valid_until' => 'date:Y-m-d',
        'sent_at' => 'datetime',
        'subtotal' => 'decimal:2',
        'discount_percent' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_percent' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'internal_labor_enabled' => 'boolean',
        'internal_worker_count' => 'integer',
        'internal_work_days' => 'decimal:2',
        'internal_daily_rate' => 'decimal:2',
        'internal_labor_total' => 'decimal:2',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class)
            ->orderBy('position')
            ->orderBy('id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function project(): HasOne
    {
        return $this->hasOne(Project::class);
    }
}
