<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_products', function (Blueprint $table) {
            $table->id();
            $table->string('sku', 60)->unique();
            $table->string('name', 180);
            $table->text('description');
            $table->string('category', 100)->index();
            $table->string('unit', 30);
            $table->decimal('unit_price', 14, 4);
            $table->decimal('stock_quantity', 14, 3)->default(0);
            $table->decimal('minimum_stock', 14, 3)->default(0);
            $table->boolean('active')->default(true)->index();
            $table->timestamps();

            $table->index(['active', 'category']);
        });

        Schema::create('inventory_stock_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_product_id')
                ->constrained('inventory_products')
                ->restrictOnDelete();
            $table->foreignId('adjusted_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->decimal('quantity_change', 14, 3);
            $table->decimal('quantity_before', 14, 3);
            $table->decimal('quantity_after', 14, 3);
            $table->string('reason', 500);
            $table->timestamps();

            $table->index(['inventory_product_id', 'created_at']);
        });

        Schema::table('quotation_items', function (Blueprint $table) {
            $table->foreignId('product_id')
                ->nullable()
                ->after('quotation_id')
                ->constrained('inventory_products')
                ->nullOnDelete();
            $table->text('description')->change();
        });
    }

    public function down(): void
    {
        Schema::table('quotation_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_id');
            $table->string('description')->change();
        });

        Schema::dropIfExists('inventory_stock_adjustments');
        Schema::dropIfExists('inventory_products');
    }
};
