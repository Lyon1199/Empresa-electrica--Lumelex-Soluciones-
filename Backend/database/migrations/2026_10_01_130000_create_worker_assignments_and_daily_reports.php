<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 40)->nullable();
        });

        Schema::create('work_order_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['work_order_id', 'user_id']);
        });

        Schema::create('daily_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('worker_id')->constrained('users')->cascadeOnDelete();
            $table->date('report_date');
            $table->text('work_done');
            $table->string('location', 255);
            $table->decimal('hours_worked', 5, 2)->nullable();
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->text('materials_used')->nullable();
            $table->text('issues')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('submitted_at');
            $table->timestamps();

            $table->unique(['work_order_id', 'worker_id', 'report_date']);
            $table->index(['worker_id', 'report_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_reports');
        Schema::dropIfExists('work_order_user');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('phone');
        });
    }
};
