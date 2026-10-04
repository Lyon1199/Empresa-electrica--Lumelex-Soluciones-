<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialTransaction extends Model
{
    protected $fillable = [
        'type',
        'description',
        'category',
        'counterparty',
        'amount',
        'issue_date',
        'due_date',
        'status',
        'payment_method',
        'paid_at',
        'project_id',
        'recorded_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'issue_date' => 'date:Y-m-d',
        'due_date' => 'date:Y-m-d',
        'paid_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
