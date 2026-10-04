<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkOrder extends Model
{
    protected $fillable = [
        'number',
        'project_id',
        'status',
        'description',
        'created_by',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function workers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'work_order_user')
            ->withPivot('assignment_type')
            ->wherePivot('assignment_type', 'tecnico')
            ->withPivotValue('assignment_type', 'tecnico')
            ->withTimestamps();
    }

    public function leaders(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'work_order_user')
            ->withPivot('assignment_type')
            ->wherePivot('assignment_type', 'lider_proyecto')
            ->withPivotValue('assignment_type', 'lider_proyecto')
            ->withTimestamps();
    }

    public function dailyReports(): HasMany
    {
        return $this->hasMany(DailyReport::class);
    }
}
