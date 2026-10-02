<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->boolean('internal_labor_enabled')->default(false);
            $table->unsignedSmallInteger('internal_worker_count')->default(0);
            $table->decimal('internal_work_days', 8, 2)->default(0);
            $table->decimal('internal_daily_rate', 14, 2)->default(0);
            $table->decimal('internal_labor_total', 14, 2)->default(0);
        });

        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('project_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending')->index();
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        DB::table('projects')
            ->orderBy('id')
            ->get(['id', 'number', 'description', 'created_by', 'created_at', 'updated_at'])
            ->each(function (object $project): void {
                $year = now()->format('Y');
                $sequence = str_pad((string) $project->id, 5, '0', STR_PAD_LEFT);
                if (preg_match('/^PRO-(\d{4})-(\d+)$/', (string) $project->number, $matches)) {
                    $year = $matches[1];
                    $sequence = $matches[2];
                }

                DB::table('work_orders')->insert([
                    'number' => "OT-{$year}-{$sequence}",
                    'project_id' => $project->id,
                    'status' => 'pending',
                    'description' => $project->description,
                    'created_by' => $project->created_by,
                    'created_at' => $project->created_at,
                    'updated_at' => $project->updated_at,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_orders');

        Schema::table('quotations', function (Blueprint $table) {
            $table->dropColumn([
                'internal_labor_enabled',
                'internal_worker_count',
                'internal_work_days',
                'internal_daily_rate',
                'internal_labor_total',
            ]);
        });
    }
};
