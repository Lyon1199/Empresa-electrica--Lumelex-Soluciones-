<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectUpdate extends Model
{
    protected $fillable = [
        'project_id',
        'created_by',
        'title',
        'description',
        'progress',
        'visible_to_customer',
    ];

    protected $casts = [
        'progress' => 'integer',
        'visible_to_customer' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(ProjectUpdatePhoto::class);
    }
}
