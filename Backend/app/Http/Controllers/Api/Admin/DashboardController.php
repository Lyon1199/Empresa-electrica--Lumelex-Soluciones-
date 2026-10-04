<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Project;
use App\Models\Quotation;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    public function index()
    {
        $data = Cache::remember('admin.dashboard.summary', now()->addSeconds(15), function () {
            $quotationSummary = Quotation::query()
                ->selectRaw('COUNT(*) as total')
                ->selectRaw("SUM(CASE WHEN status IN ('draft', 'sent') THEN 1 ELSE 0 END) as open_quotations")
                ->selectRaw("COALESCE(SUM(CASE WHEN status IN ('draft', 'sent') THEN total ELSE 0 END), 0) as open_quotation_value")
                ->first();

            return [
                'users' => User::count(),
                'customers' => Customer::count(),
                'projects' => Project::count(),
                'quotations' => (int) $quotationSummary->total,
                'open_quotations' => (int) $quotationSummary->open_quotations,
                'open_quotation_value' => (float) $quotationSummary->open_quotation_value,
                'work_orders' => WorkOrder::count(),
            ];
        });

        return response()->json(['data' => $data]);
    }
}
