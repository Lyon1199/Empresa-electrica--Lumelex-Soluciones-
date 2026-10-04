<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class InventoryProduct extends Model
{
    protected $fillable = [
        'sku',
        'name',
        'description',
        'category',
        'unit',
        'unit_price',
        'stock_quantity',
        'minimum_stock',
        'active',
        'image_path',
    ];

    protected $casts = [
        'unit_price' => 'decimal:4',
        'stock_quantity' => 'decimal:3',
        'minimum_stock' => 'decimal:3',
        'active' => 'boolean',
    ];

    protected $appends = ['low_stock', 'is_active', 'stock_status', 'image_url'];

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path
            ? Storage::disk('public')->url($this->image_path)
            : null;
    }

    public function getLowStockAttribute(): bool
    {
        return (float) $this->stock_quantity <= (float) $this->minimum_stock;
    }

    public function getIsActiveAttribute(): bool
    {
        return (bool) $this->active;
    }

    public function getStockStatusAttribute(): string
    {
        if ((float) $this->stock_quantity <= 0) {
            return 'out_of_stock';
        }

        return $this->low_stock ? 'low_stock' : 'in_stock';
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(InventoryStockAdjustment::class);
    }
}
