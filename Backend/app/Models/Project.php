<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Project extends Model
{
    protected $fillable = [
        'quotation_id',
        'customer_id',
        'title',
        'status',
        'progress',
        'description',
        'starts_at',
        'target_date',
        'created_by',
    ];

    protected $casts = [
        'progress' => 'integer',
        'starts_at' => 'date:Y-m-d',
        'target_date' => 'date:Y-m-d',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function updates(): HasMany
    {
        return $this->hasMany(ProjectUpdate::class)->orderByDesc('created_at')->orderByDesc('id');
    }

    public function materials(): HasMany
    {
        return $this->hasMany(ProjectMaterial::class)->orderBy('created_at')->orderBy('id');
    }

    public function depositReceipts(): HasMany
    {
        return $this->hasMany(DepositReceipt::class)->latest();
    }

    public function workOrder(): HasOne
    {
        return $this->hasOne(WorkOrder::class);
    }
}
