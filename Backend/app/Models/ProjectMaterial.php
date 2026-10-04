<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectMaterial extends Model
{
    protected $appends = ['total_cost'];

    protected $fillable = [
        'project_id',
        'name',
        'quantity',
        'unit',
        'unit_cost',
        'notes',
        'recorded_by',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_cost' => 'decimal:2',
    ];

    protected function totalCost(): Attribute
    {
        return Attribute::get(fn () => round((float) $this->quantity * (float) $this->unit_cost, 2));
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
