<?php

namespace App\Http\Controllers\API;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class RoleController extends CrudController
{
    protected string $modelClass = Role::class;

    protected array $relations = ['permissions'];

    protected array $sortable = ['id', 'name', 'created_at', 'updated_at'];

    protected function rules(?Model $model = null): array
    {
        $roleId = $model?->getKey();

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('roles', 'name')->ignore($roleId),
            ],
            'guard_name' => ['nullable', 'string', 'max:255'],
            'permission_names' => ['sometimes', 'array'],
            'permission_names.*' => ['string', Rule::exists('permissions', 'name')],
        ];
    }

    protected function mutateValidatedData(array $validated, ?Model $model): array
    {
        $validated['guard_name'] = $validated['guard_name'] ?? 'web';

        return $validated;
    }

    protected function applySearch($query, string $search): void
    {
        $query->where('name', 'like', "%{$search}%");
    }

    protected function newQuery(): Builder
    {
        return $this->modelClass::query()
            ->with($this->relations)
            ->select('roles.*')
            ->selectSub(
                DB::table('model_has_roles')
                    ->selectRaw('count(*)')
                    ->whereColumn('role_id', 'roles.id')
                    ->where('model_type', User::class),
                'users_count'
            );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());
        $permissionNames = $validated['permission_names'] ?? [];
        unset($validated['permission_names']);

        /** @var Role $role */
        $role = Role::query()->create($this->mutateValidatedData($validated, null));

        if ($permissionNames !== []) {
            $role->syncPermissions($permissionNames);
        }

        return response()->json([
            'message' => 'Role created successfully.',
            'data' => $this->freshModel($role),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        /** @var Role $role */
        $role = Role::query()->findOrFail($id);

        if ($this->isSuperAdminRole($role->name)) {
            return response()->json([
                'message' => 'Super-admin role cannot be modified.',
            ], 403);
        }

        $validated = $request->validate($this->rules($role));
        $permissionNames = $validated['permission_names'] ?? null;
        unset($validated['permission_names']);

        $role->update($this->mutateValidatedData($validated, $role));

        if (is_array($permissionNames)) {
            $role->syncPermissions($permissionNames);
        }

        return response()->json([
            'message' => 'Role updated successfully.',
            'data' => $this->freshModel($role),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        /** @var Role $role */
        $role = Role::query()->findOrFail($id);

        if ($this->isSuperAdminRole($role->name)) {
            return response()->json([
                'message' => 'Super-admin role cannot be deleted.',
            ], 403);
        }

        return parent::destroy($id);
    }

    private function isSuperAdminRole(string $name): bool
    {
        $normalized = str_replace(['_', ' '], '-', strtolower($name));

        return $normalized === 'super-admin' || $normalized === 'superadmin';
    }
}
