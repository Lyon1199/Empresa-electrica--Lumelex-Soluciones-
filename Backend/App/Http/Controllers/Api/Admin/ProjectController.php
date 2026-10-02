<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:150'],
            'status' => ['sometimes', Rule::in(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'])],
        ]);

        $query = Project::query()
            ->with(['customer:id,name,identification,email', 'quotation:id,number,total,status'])
            ->with('workOrder:id,project_id,number,status,description,created_at')
            ->with(['customer.portalUsers:id,customer_id,name,email'])
            ->withCount('depositReceipts');

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['search'])) {
            $search = mb_strtolower($filters['search']);
            $query->where(function ($query) use ($search) {
                $query->whereRaw('LOWER(number) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(title) LIKE ?', ["%{$search}%"])
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"])
                            ->orWhereRaw('LOWER(identification) LIKE ?', ["%{$search}%"]);
                    });
            });
        }

        return response()->json(
            $query->orderByDesc('created_at')->paginate(20)
        );
    }

    public function show(Project $project)
    {
        return response()->json([
            'data' => $project->load([
                'customer:id,name,identification,email,phone,address',
                'customer.portalUsers:id,customer_id,name,email',
                'quotation:id,number,title,total,issue_date,valid_until',
                'workOrder:id,project_id,number,status,description,created_at',
                'updates.creator:id,name',
                'updates.photos',
                'materials.recorder:id,name',
                'depositReceipts.uploader:id,name,email',
                'depositReceipts.reviewer:id,name',
            ]),
        ]);
    }

    public function update(Request $request, Project $project)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'])],
            'progress' => ['required', 'integer', 'between:0,100'],
            'starts_at' => ['nullable', 'date'],
            'target_date' => ['nullable', 'date'],
            'update_title' => ['required', 'string', 'max:180'],
            'update_description' => ['required', 'string', 'max:5000'],
            'visible_to_customer' => ['sometimes', 'boolean'],
        ]);

        $project = DB::transaction(function () use ($data, $project, $request) {
            $lockedProject = Project::query()->lockForUpdate()->findOrFail($project->id);
            if ($data['progress'] < $lockedProject->progress) {
                return false;
            }

            $hasDuplicateProgress = $data['progress'] > $lockedProject->progress
                && $lockedProject->updates()
                    ->where('progress', $data['progress'])
                    ->exists();

            if ($hasDuplicateProgress) {
                return false;
            }

            $progressIncreased = $data['progress'] > $lockedProject->progress;
            $lockedProject->update([
                'status' => $data['status'],
                'progress' => $progressIncreased ? $data['progress'] : $lockedProject->progress,
                'starts_at' => $data['starts_at'] ?? null,
                'target_date' => $data['target_date'] ?? $lockedProject->target_date,
            ]);

            $lockedProject->updates()->create([
                'created_by' => $request->user()->id,
                'title' => $data['update_title'],
                'description' => $data['update_description'],
                'progress' => $progressIncreased ? $data['progress'] : null,
                'visible_to_customer' => $data['visible_to_customer'] ?? true,
            ]);

            return $lockedProject->fresh();
        });

        if (! $project) {
            return response()->json([
                'message' => 'El avance no puede retroceder ni repetir un porcentaje ya publicado.',
                'errors' => ['progress' => ['Selecciona un porcentaje superior al avance actual y que no exista en el historial.']],
            ], 422);
        }

        return response()->json([
            'message' => 'Avance del proyecto actualizado.',
            'data' => $project->load([
                'customer:id,name,identification,email,phone,address',
                'quotation:id,number,title,total,issue_date,valid_until',
                'workOrder:id,project_id,number,status,description,created_at',
                'updates.creator:id,name',
                'updates.photos',
                'materials.recorder:id,name',
                'depositReceipts.uploader:id,name,email',
                'depositReceipts.reviewer:id,name',
            ]),
        ]);
    }
}
