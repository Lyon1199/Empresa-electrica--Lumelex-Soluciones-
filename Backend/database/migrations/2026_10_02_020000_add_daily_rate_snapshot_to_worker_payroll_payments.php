<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('worker_payroll_payments', function (Blueprint $table) {
            $table->decimal('daily_rate', 10, 2)->nullable()->after('month');
        });
    }

    public function down(): void
    {
        Schema::table('worker_payroll_payments', function (Blueprint $table) {
            $table->dropColumn('daily_rate');
        });
    }
};
