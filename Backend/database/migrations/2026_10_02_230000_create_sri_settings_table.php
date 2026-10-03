<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sri_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->string('issuer_ruc', 13)->nullable();
            $table->string('provider_ruc', 13)->nullable();
            $table->string('legal_name', 300)->nullable();
            $table->string('trade_name', 300)->nullable();
            $table->string('matrix_address', 300)->nullable();
            $table->string('special_taxpayer', 13)->nullable();
            $table->boolean('accounting_required')->default(false);
            $table->string('environment', 12)->default('testing');
            $table->string('establishment', 3)->default('001');
            $table->string('emission_point', 3)->default('001');
            $table->string('emission_type', 1)->default('1');
            $table->unsignedInteger('next_testing_sequence')->default(1);
            $table->unsignedInteger('next_production_sequence')->default(1);
            $table->decimal('vat_rate', 5, 2)->default(13);
            $table->string('vat_percentage_code', 2)->nullable();
            $table->decimal('materials_vat_rate', 5, 2)->default(5);
            $table->string('materials_vat_percentage_code', 2)->nullable();
            $table->string('payment_method', 2)->default('20');
            $table->longText('encrypted_certificate')->nullable();
            $table->longText('encrypted_certificate_password')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('electronic_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('environment', 12);
            $table->string('establishment', 3);
            $table->string('emission_point', 3);
            $table->string('sequence', 9);
            $table->string('access_key', 49)->unique();
            $table->string('status', 20)->default('pending');
            $table->decimal('subtotal', 14, 2);
            $table->decimal('discount', 14, 2);
            $table->decimal('vat_rate', 5, 2);
            $table->decimal('vat_amount', 14, 2);
            $table->json('vat_breakdown')->nullable();
            $table->decimal('total', 14, 2);
            $table->longText('signed_xml')->nullable();
            $table->longText('authorized_xml')->nullable();
            $table->string('authorization_number', 49)->nullable();
            $table->json('sri_messages')->nullable();
            $table->timestamp('authorized_at')->nullable();
            $table->timestamps();

            $table->index(['environment', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('electronic_invoices');
        Schema::dropIfExists('sri_settings');
    }
};
