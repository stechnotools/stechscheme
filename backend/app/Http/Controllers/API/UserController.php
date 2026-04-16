<?php

namespace App\Http\Controllers\API;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

class UserController extends CrudController
{
    protected string $modelClass = User::class;

    protected array $relations = ['roles', 'branches', 'memberships.scheme', 'transactions'];

    protected array $filterable = ['status', 'gender', 'mobile_verified'];

    protected array $sortable = ['id', 'name', 'email', 'mobile', 'created_at', 'updated_at'];

    protected function rules(?Model $model = null): array
    {
        $userId = $model?->getKey();

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'mobile' => ['nullable', 'string', 'max:20', Rule::unique('users', 'mobile')->ignore($userId)],
            'password' => [$model ? 'nullable' : 'required', 'string', 'min:8'],
            'profile_photo' => ['nullable', 'string', 'max:255'],
            'dob' => ['nullable', 'date'],
            'gender' => ['nullable', 'string', 'max:50'],
            'mobile_verified' => ['sometimes', 'boolean'],
            'mobile_verified_at' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'blocked'])],
            'role_names' => ['sometimes', 'array'],
            'role_names.*' => ['string', Rule::exists('roles', 'name')],
            'branch_ids' => ['sometimes', 'array'],
            'branch_ids.*' => ['integer', Rule::exists('branches', 'id')],
        ];
    }

    protected function mutateValidatedData(array $validated, ?Model $model): array
    {
        if (empty($validated['password'])) {
            unset($validated['password']);
        } elseif (! Hash::isHashed($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        return $validated;
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
        $roleNames = $validated['role_names'] ?? [];
        $branchIds = $validated['branch_ids'] ?? [];
        unset($validated['role_names']);
        unset($validated['branch_ids']);

        /** @var User $user */
        $user = User::query()->create($this->mutateValidatedData($validated, null));

        if (is_array($roleNames) && $roleNames !== []) {
            $user->syncRoles($roleNames);
        }

        if (is_array($branchIds)) {
            $user->branches()->sync($branchIds);
        }

        $this->syncCustomerRecordForCustomerRole($user, $roleNames);

        return response()->json([
            'message' => 'User created successfully.',
            'data' => $this->freshModel($user),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = User::query()->findOrFail($id);
        $validated = $request->validate($this->rules($user));
        $roleNames = $validated['role_names'] ?? null;
        $branchIds = $validated['branch_ids'] ?? null;
        unset($validated['role_names']);
        unset($validated['branch_ids']);

        $user->update($this->mutateValidatedData($validated, $user));

        if (is_array($roleNames)) {
            $user->syncRoles($roleNames);
        }

        if (is_array($branchIds)) {
            $user->branches()->sync($branchIds);
        }

        $this->syncCustomerRecordForCustomerRole($user, $roleNames);

        return response()->json([
            'message' => 'User updated successfully.',
            'data' => $this->freshModel($user),
        ]);
    }

    private function syncCustomerRecordForCustomerRole(User $user, ?array $roleNames): void
    {
        if (! $this->hasCustomerRole($roleNames)) {
            return;
        }

        if (empty($user->mobile)) {
            throw ValidationException::withMessages([
                'mobile' => 'Mobile number is required when assigning customer role.',
            ]);
        }

        $customerQuery = Customer::query()->where('mobile', $user->mobile);

        if (! empty($user->email)) {
            $customerQuery->orWhere('email', $user->email);
        }

        $customer = $customerQuery->first();

        if ($customer) {
            $customer->update([
                'name' => $user->name,
                'mobile' => $user->mobile,
                'email' => $user->email,
                'status' => in_array($user->status, ['active', 'inactive'], true) ? $user->status : 'active',
            ]);

            return;
        }

        Customer::query()->create([
            'name' => $user->name,
            'mobile' => $user->mobile,
            'email' => $user->email,
            'status' => in_array($user->status, ['active', 'inactive'], true) ? $user->status : 'active',
        ]);
    }

    private function hasCustomerRole(?array $roleNames): bool
    {
        if (! is_array($roleNames)) {
            return false;
        }

        foreach ($roleNames as $roleName) {
            $normalized = str_replace(['_', ' '], '-', strtolower((string) $roleName));

            if ($normalized === 'customer') {
                return true;
            }
        }

        return false;
    }
}
