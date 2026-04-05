<?php

namespace App\Http\Controllers\API;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;

class PermissionController extends CrudController
{
    protected string $modelClass = Permission::class;

    protected array $relations = ['roles'];

    protected array $sortable = ['id', 'name', 'created_at', 'updated_at'];

    protected function rules(?\Illuminate\Database\Eloquent\Model $model = null): array
    {
        $permissionId = $model?->getKey();

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/',
                Rule::unique('permissions', 'name')->ignore($permissionId),
            ],
            'guard_name' => ['nullable', 'string', 'max:255'],
            'role_names' => ['sometimes', 'array'],
            'role_names.*' => ['string', Rule::exists('roles', 'name')],
        ];
    }

    protected function mutateValidatedData(array $validated, ?\Illuminate\Database\Eloquent\Model $model): array
    {
        $validated['guard_name'] = $validated['guard_name'] ?? 'web';

        return $validated;
    }

    protected function applySearch($query, string $search): void
    {
        $query->where('name', 'like', "%{$search}%");
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());
        $roleNames = $validated['role_names'] ?? [];
        unset($validated['role_names']);

        /** @var Permission $permission */
        $permission = Permission::query()->create($this->mutateValidatedData($validated, null));

        if ($roleNames !== []) {
            $permission->syncRoles($roleNames);
        }

        return response()->json([
            'message' => 'Permission created successfully.',
            'data' => $permission->load($this->relations),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        /** @var Permission $permission */
        $permission = Permission::query()->findOrFail($id);
        $validated = $request->validate($this->rules($permission));
        $roleNames = $validated['role_names'] ?? null;
        unset($validated['role_names']);

        $permission->update($this->mutateValidatedData($validated, $permission));

        if (is_array($roleNames)) {
            $permission->syncRoles($roleNames);
        }

        return response()->json([
            'message' => 'Permission updated successfully.',
            'data' => $permission->load($this->relations),
        ]);
    }
}
