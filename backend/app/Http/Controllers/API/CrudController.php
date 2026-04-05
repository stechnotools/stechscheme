<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class CrudController extends Controller
{
    protected string $modelClass;

    protected array $relations = [];

    protected array $filterable = [];

    protected array $sortable = ['id', 'created_at', 'updated_at'];

    protected int $defaultPerPage = 15;

    public function index(Request $request): JsonResponse
    {
        $query = $this->newQuery();

        foreach ($this->filterable as $field) {
            if ($request->filled($field)) {
                $query->where($field, $request->input($field));
            }
        }

        if ($request->filled('search')) {
            $this->applySearch($query, (string) $request->input('search'));
        }

        $sortBy = $request->input('sort_by', 'id');
        $sortDirection = strtolower((string) $request->input('sort_direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        if (in_array($sortBy, $this->sortable, true)) {
            $query->orderBy($sortBy, $sortDirection);
        }

        $perPage = max(1, min((int) $request->input('per_page', $this->defaultPerPage), 100));

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());
        $model = $this->modelClass::create($this->mutateValidatedData($validated, null));

        return response()->json([
            'message' => class_basename($this->modelClass) . ' created successfully.',
            'data' => $this->freshModel($model),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => $this->freshModel($this->newQuery()->findOrFail($id)),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $model = $this->modelClass::query()->findOrFail($id);
        $validated = $request->validate($this->rules($model));
        $model->update($this->mutateValidatedData($validated, $model));

        return response()->json([
            'message' => class_basename($this->modelClass) . ' updated successfully.',
            'data' => $this->freshModel($model),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $model = $this->modelClass::query()->findOrFail($id);
        $model->delete();

        return response()->json([
            'message' => class_basename($this->modelClass) . ' deleted successfully.',
        ]);
    }

    abstract protected function rules(?Model $model = null): array;

    protected function mutateValidatedData(array $validated, ?Model $model): array
    {
        return $validated;
    }

    protected function applySearch($query, string $search): void
    {
    }

    protected function newQuery()
    {
        return $this->modelClass::query()->with($this->relations);
    }

    protected function freshModel(Model $model): Model
    {
        return $model->fresh($this->relations) ?? $model;
    }
}
