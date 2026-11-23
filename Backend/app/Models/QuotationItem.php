<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotationItem extends Model
{
    protected $fillable = [
        'product_id',
        'category',
        'description',
        'unit',
        'quantity',
        'unit_price',
        'line_total',
        'costing_enabled',
        'internal_material_cost',
        'internal_logistics_cost',
        'internal_labor_entries',
        'position',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:4',
        'line_total' => 'decimal:2',
        'costing_enabled' => 'boolean',
        'internal_material_cost' => 'decimal:4',
        'internal_logistics_cost' => 'decimal:4',
        'internal_labor_entries' => 'array',
    ];

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(InventoryProduct::class, 'product_id');
    }
}
