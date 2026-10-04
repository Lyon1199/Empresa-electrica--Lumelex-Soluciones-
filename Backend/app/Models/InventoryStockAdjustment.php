<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryStockAdjustment extends Model
{
    protected $fillable = [
        'inventory_product_id',
        'adjusted_by',
        'quantity_change',
        'quantity_before',
        'quantity_after',
        'reason',
    ];

    protected $casts = [
        'quantity_change' => 'decimal:3',
        'quantity_before' => 'decimal:3',
        'quantity_after' => 'decimal:3',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(InventoryProduct::class, 'inventory_product_id');
    }

    public function adjustedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adjusted_by');
    }
}
