<?php

namespace App\Http\Controllers\Api\Worker;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectUpdatePhoto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ProjectUpdateController extends Controller
{
    public function store(Request $request, Project $project)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'description' => ['required', 'string', 'max:5000'],
            'progress' => ['required', 'integer', 'between:0,100'],
            'visible_to_customer' => ['sometimes', 'boolean'],
            'photos' => ['sometimes', 'array', 'max:8'],
            'photos.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ]);

        $user = $request->user();
        abort_unless(
            $user->hasRole('lider_proyecto')
                && $user->assignedProjects()
                    ->where('work_orders.project_id', $project->id)
                    ->whereIn('work_orders.status', ['pending', 'in_progress'])
                    ->exists(),
            404
        );

        $storedPaths = [];
        try {
            $update = DB::transaction(function () use ($data, $request, $project, &$storedPaths) {
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
                $update = $lockedProject->updates()->create([
                    'created_by' => $request->user()->id,
                    'title' => $data['title'],
                    'description' => $data['description'],
                    'progress' => $progressIncreased ? $data['progress'] : null,
                    'visible_to_customer' => $data['visible_to_customer'] ?? true,
                ]);
                if ($progressIncreased) {
                    $lockedProject->update(['progress' => $data['progress']]);
                }

                foreach ($request->file('photos', []) as $photo) {
                    $path = $photo->store('project-updates/'.$project->id, 'local');
                    if (! $path) {
                        throw new \RuntimeException('No se pudo almacenar una de las fotografías.');
                    }
                    $storedPaths[] = $path;
                    $update->photos()->create([
                        'disk' => 'local',
                        'path' => $path,
                        'original_name' => $photo->getClientOriginalName(),
                        'mime_type' => $photo->getMimeType(),
                        'size' => $photo->getSize(),
                    ]);
                }

                return $update;
            });
        } catch (Throwable $exception) {
            foreach ($storedPaths as $path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        if (! $update) {
            return response()->json([
                'message' => 'El avance no puede retroceder ni repetir un porcentaje ya publicado.',
                'errors' => ['progress' => ['Selecciona un porcentaje superior al avance actual y que no exista en el historial.']],
            ], 422);
        }

        return response()->json([
            'message' => 'Avance del proyecto publicado.',
            'data' => $update->load(['creator:id,name', 'photos']),
        ], 201);
    }

    public function photo(Request $request, ProjectUpdatePhoto $photo)
    {
        $photo->load('projectUpdate.project.workOrder');
        $user = $request->user();
        $projectUpdate = $photo->projectUpdate;
        $project = $projectUpdate->project;

        $authorized = $user->hasRole('admin')
            || $user->hasRole('gerente')
            || $user->hasRole('contabilidad')
            || $user->hasRole('supervisor')
            || ($user->hasRole('lider_proyecto')
                && $user->assignedProjects()
                    ->where('work_orders.project_id', $project->id)
                    ->exists())
            || ($user->hasRole('cliente')
                && (int) $user->customer_id === (int) $project->customer_id
                && $projectUpdate->visible_to_customer);

        abort_unless($authorized, 404);
        abort_unless(Storage::disk($photo->disk)->exists($photo->path), 404);

        return Storage::disk($photo->disk)->response(
            $photo->path,
            $photo->original_name,
            ['Content-Type' => $photo->mime_type]
        );
    }
}
