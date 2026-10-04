<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyReport extends Model
{
    protected $fillable = [
        'work_order_id',
        'worker_id',
        'report_date',
        'work_done',
        'location',
        'hours_worked',
        'start_time',
        'end_time',
        'materials_used',
        'issues',
        'notes',
        'submitted_at',
    ];

    protected $casts = [
        'report_date' => 'date:Y-m-d',
        'hours_worked' => 'decimal:2',
        'submitted_at' => 'datetime',
    ];

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'worker_id');
    }
}
