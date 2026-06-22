<?php

namespace App\Http\Controllers\API;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class SalesmanController extends CrudController
{
    protected string $modelClass = User::class;

    protected array $relations = ['roles', 'branches'];

    protected array $filterable = ['status'];

    protected array $sortable = ['id', 'name', 'email', 'mobile', 'created_at', 'updated_at'];

    /**
     * Salesman Master only ever shows/touches users carrying the 'salesman' role.
     */
    protected function newQuery()
    {
        return User::query()->role('salesman')->with($this->relations);
    }

    protected function applySearch($query, string $search): void
    {
        $query->where(function ($builder) use ($search) {
            $builder->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('mobile', 'like', "%{$search}%");
        });
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());
        $branchIds = $validated['branch_ids'] ?? [];
        unset($validated['branch_ids']);

        /** @var User $user */
        $user = User::query()->create($this->mutateValidatedData($validated, null));
        $user->assignRole(Role::findOrCreate('salesman', 'web'));

        if (is_array($branchIds)) {
            $user->branches()->sync($branchIds);
        }

        return response()->json([
            'message' => 'Salesman created successfully.',
            'data' => $this->freshModel($user),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->newQuery()->findOrFail($id);
        $validated = $request->validate($this->rules($user));
        $branchIds = $validated['branch_ids'] ?? null;
        unset($validated['branch_ids']);

        $user->update($this->mutateValidatedData($validated, $user));

        if (is_array($branchIds)) {
            $user->branches()->sync($branchIds);
        }

        return response()->json([
            'message' => 'Salesman updated successfully.',
            'data' => $this->freshModel($user),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $user = $this->newQuery()->findOrFail($id);
        $user->delete();

        return response()->json([
            'message' => 'Salesman deleted successfully.',
        ]);
    }

    protected function rules(?Model $model = null): array
    {
        $userId = $model?->getKey();

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'mobile' => ['nullable', 'string', 'max:20', Rule::unique('users', 'mobile')->ignore($userId)],
            'password' => ['nullable', 'string', 'min:8'],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'blocked'])],
            'branch_ids' => ['sometimes', 'array'],
            'branch_ids.*' => ['integer', Rule::exists('branches', 'id')],
        ];
    }

    /**
     * Auto-generates a password (when creating without one) and a synthetic
     * unique email (users.email is NOT NULL at the DB level) so admins can
     * register a salesman with just a name.
     */
    protected function mutateValidatedData(array $validated, ?Model $model): array
    {
        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } elseif (! $model) {
            $validated['password'] = Hash::make(Str::random(16));
        } else {
            unset($validated['password']);
        }

        if (empty($validated['email']) && ! $model) {
            $slug = Str::slug($validated['name'] ?? '') ?: 'salesman';
            $validated['email'] = "salesman.{$slug}." . Str::lower(Str::random(6)) . '@internal.local';
        }

        return $validated;
    }
}
