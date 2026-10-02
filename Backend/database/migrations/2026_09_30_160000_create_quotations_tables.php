<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique()->nullable();
            $table->foreignId('customer_id')
                ->constrained()
                ->restrictOnDelete();
            $table->string('customer_name');
            $table->string('customer_identification', 30);
            $table->string('customer_email')->nullable();
            $table->string('customer_address')->nullable();
            $table->string('title');
            $table->date('issue_date');
            $table->date('valid_until');
            $table->string('status')->default('draft')->index();
            $table->text('scope')->nullable();
            $table->text('notes')->nullable();
            $table->text('terms')->nullable();
            $table->string('currency', 3)->default('USD');
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('discount_percent', 5, 2)->default(0);
            $table->decimal('discount_amount', 14, 2)->default(0);
            $table->decimal('tax_percent', 5, 2)->default(15);
            $table->decimal('tax_amount', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();

            $table->index(['customer_id', 'issue_date']);
            $table->index(['status', 'valid_until']);
        });

        Schema::create('quotation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->string('category')->default('material');
            $table->string('description');
            $table->string('unit', 30);
            $table->decimal('quantity', 12, 3);
            $table->decimal('unit_price', 14, 4);
            $table->decimal('line_total', 14, 2);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['quotation_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotation_items');
        Schema::dropIfExists('quotations');
    }
};
