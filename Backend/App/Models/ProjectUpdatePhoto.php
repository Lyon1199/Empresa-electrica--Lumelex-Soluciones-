<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectUpdatePhoto extends Model
{
    protected $fillable = [
        'project_update_id',
        'disk',
        'path',
        'original_name',
        'mime_type',
        'size',
    ];

    protected $appends = ['download_url'];

    protected $hidden = ['disk', 'path'];

    public function projectUpdate(): BelongsTo
    {
        return $this->belongsTo(ProjectUpdate::class, 'project_update_id');
    }

    public function getDownloadUrlAttribute(): string
    {
        return url('/api/worker/project-update-photos/'.$this->id);
    }
}
