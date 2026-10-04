<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class)
            ->withTimestamps();
    }

    public function hasRole(string $role): bool
    {
        return $this->roles()
            ->where('slug', $role)
            ->where('active', true)
            ->exists();
    }

    public function hasPermission(string $permission): bool
    {
        return $this->roles()
            ->where('roles.active', true)
            ->whereHas('permissions', function ($query) use ($permission) {
                $query->where('permissions.slug', $permission);
            })
            ->exists();
    }

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'customer_id',
        'name',
        'email',
        'password',
        'phone',
        'daily_rate',
        'identification',
        'must_change_password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'daily_rate' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function uploadedDepositReceipts(): HasMany
    {
        return $this->hasMany(DepositReceipt::class, 'uploaded_by');
    }

    public function assignedWorkOrders(): BelongsToMany
    {
        return $this->belongsToMany(WorkOrder::class, 'work_order_user')
            ->withPivot('assignment_type')
            ->withTimestamps();
    }

    public function assignedProjects(): BelongsToMany
    {
        return $this->belongsToMany(WorkOrder::class, 'work_order_user')
            ->wherePivot('assignment_type', 'lider_proyecto')
            ->withPivot('assignment_type')
            ->withTimestamps();
    }

    public function dailyReports(): HasMany
    {
        return $this->hasMany(DailyReport::class, 'worker_id');
    }
}
