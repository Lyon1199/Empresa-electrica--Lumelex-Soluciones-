<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectMaterial;
use Illuminate\Http\Request;

class ProjectMaterialController extends Controller
{
    public function index(Project $project)
    {
        $materials = $project->materials()->with('recorder:id,name')->get();

        return response()->json([
            'data' => $materials,
            'total_cost' => round($materials->sum(fn (ProjectMaterial $material) => $material->total_cost), 2),
        ]);
    }

    public function store(Request $request, Project $project)
    {
        $this->ensureProjectIsActive($project);
        $data = $this->validatedData($request);
        $material = $project->materials()->create([
            ...$data,
            'recorded_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => $material->load('recorder:id,name'),
        ], 201);
    }

    public function update(Request $request, Project $project, ProjectMaterial $material)
    {
        $this->ensureProjectIsActive($project);
        $this->ensureBelongsToProject($project, $material);
        $material->update($this->validatedData($request));

        return response()->json([
            'data' => $material->fresh()->load('recorder:id,name'),
        ]);
    }

    public function destroy(Project $project, ProjectMaterial $material)
    {
        $this->ensureProjectIsActive($project);
        $this->ensureBelongsToProject($project, $material);
        $material->delete();

        return response()->json(['message' => 'Material eliminado del proyecto.']);
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'quantity' => ['required', 'numeric', 'gt:0', 'max:999999999.999'],
            'unit' => ['required', 'string', 'max:40'],
            'unit_cost' => ['required', 'numeric', 'gte:0', 'max:9999999999.99'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
    }

    private function ensureBelongsToProject(Project $project, ProjectMaterial $material): void
    {
        abort_unless((int) $material->project_id === (int) $project->id, 404);
    }

    private function ensureProjectIsActive(Project $project): void
    {
        abort_if(in_array($project->status, ['completed', 'cancelled'], true), 422, 'No se pueden modificar materiales de un proyecto cerrado.');
    }
}
