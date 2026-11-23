<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->string('city', 150)->nullable();
            $table->string('requester', 180)->nullable();
            $table->text('payment_terms')->nullable();
            $table->decimal('markup_percent', 6, 2)->default(15);
        });

        Schema::table('quotation_items', function (Blueprint $table) {
            $table->boolean('costing_enabled')->default(false);
            $table->decimal('internal_material_cost', 14, 4)->default(0);
            $table->decimal('internal_logistics_cost', 14, 4)->default(0);
            $table->json('internal_labor_entries')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('quotation_items', function (Blueprint $table) {
            $table->dropColumn([
                'costing_enabled',
                'internal_material_cost',
                'internal_logistics_cost',
                'internal_labor_entries',
            ]);
        });

        Schema::table('quotations', function (Blueprint $table) {
            $table->dropColumn([
                'city',
                'requester',
                'payment_terms',
                'markup_percent',
            ]);
        });
    }
};
