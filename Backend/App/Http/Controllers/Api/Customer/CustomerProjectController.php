<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;

class CustomerProjectController extends Controller
{
    public function index(Request $request)
    {
        $projects = Project::query()
            ->where('customer_id', $request->user()->customer_id)
            ->with([
                'quotation:id,number,title,total,issue_date,valid_until',
                'workOrder:id,project_id,number,status',
                'updates' => fn ($query) => $query
                    ->where('visible_to_customer', true)
                    ->with(['creator:id,name', 'photos']),
                'depositReceipts:id,project_id,original_name,mime_type,size,amount,notes,status,review_notes,created_at',
            ])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $projects]);
    }

    public function show(Request $request, Project $project)
    {
        abort_unless(
            (int) $project->customer_id === (int) $request->user()->customer_id,
            404
        );

        return response()->json([
            'data' => $project->load([
                'quotation:id,number,title,total,issue_date,valid_until',
                'workOrder:id,project_id,number,status',
                'updates' => fn ($query) => $query
                    ->where('visible_to_customer', true)
                    ->with(['creator:id,name', 'photos']),
                'depositReceipts:id,project_id,original_name,mime_type,size,amount,notes,status,review_notes,created_at',
            ]),
        ]);
    }
}
