<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('type', 20)->index();
            $table->string('description');
            $table->string('category', 100);
            $table->string('counterparty')->nullable();
            $table->decimal('amount', 14, 2);
            $table->date('issue_date')->index();
            $table->date('due_date')->nullable()->index();
            $table->string('status', 20)->default('pending')->index();
            $table->string('payment_method', 30)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('project_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();
            $table->foreignId('recorded_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();

            $table->index(['type', 'status', 'issue_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_transactions');
    }
};
