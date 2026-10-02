<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('customer_id')
                ->nullable()
                ->unique()
                ->after('id')
                ->constrained()
                ->nullOnDelete();
            $table->boolean('must_change_password')->default(false);
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique()->nullable();
            $table->foreignId('quotation_id')
                ->unique()
                ->constrained()
                ->restrictOnDelete();
            $table->foreignId('customer_id')
                ->constrained()
                ->restrictOnDelete();
            $table->string('title');
            $table->string('status')->default('planning')->index();
            $table->unsignedTinyInteger('progress')->default(0);
            $table->text('description')->nullable();
            $table->date('starts_at')->nullable();
            $table->date('target_date')->nullable();
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();

            $table->index(['customer_id', 'status']);
        });

        Schema::create('project_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('title');
            $table->text('description');
            $table->unsignedTinyInteger('progress')->nullable();
            $table->boolean('visible_to_customer')->default(true);
            $table->timestamps();

            $table->index(['project_id', 'visible_to_customer']);
        });

        Schema::create('deposit_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->foreignId('uploaded_by')
                ->constrained('users')
                ->restrictOnDelete();
            $table->string('disk')->default('local');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->decimal('amount', 14, 2)->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('pending')->index();
            $table->foreignId('reviewed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deposit_receipts');
        Schema::dropIfExists('project_updates');
        Schema::dropIfExists('projects');

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('customer_id');
            $table->dropColumn('must_change_password');
        });
    }
};
