<?php

namespace App\Http\Controllers\Api\Worker;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class WorkOrderController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $assignmentType = $user->hasRole('lider_proyecto') ? 'lider_proyecto' : 'tecnico';
        $orders = $user
            ->assignedWorkOrders()
            ->wherePivot('assignment_type', $assignmentType)
            ->whereIn('status', ['pending', 'in_progress'])
            ->with([
                'project.customer:id,name,phone,address',
                'project.quotation:id,number,title',
                'project.updates' => fn ($updates) => $updates
                    ->with(['creator:id,name', 'photos'])
                    ->latest(),
            ])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $orders]);
    }
}
