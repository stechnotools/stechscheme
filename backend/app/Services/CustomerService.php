<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerKyc;
use App\Models\User;
use App\Models\Branch;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class CustomerService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = Customer::query()->with(['kyc']);

        foreach (['status'] as $field) {
            if (! empty($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'ilike', "%{$search}%")
                    ->orWhere('mobile', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $sortBy = (string) ($filters['sort_by'] ?? 'id');
        $sortBy = in_array($sortBy, ['id', 'name', 'mobile', 'created_at', 'updated_at'], true)
            ? $sortBy
            : 'id';
        $sortDirection = strtolower((string) ($filters['sort_direction'] ?? 'desc')) === 'asc' ? 'asc' : 'desc';
        $perPage = max(1, min((int) ($filters['per_page'] ?? 15), 100));

        return $query->orderBy($sortBy, $sortDirection)->paginate($perPage);
    }

    public function create(array $validated): Customer
    {
        return DB::transaction(function () use ($validated) {
            $customerPayload = $validated;
            $kycPayload = $customerPayload['kyc'] ?? null;
            unset($customerPayload['kyc']);

            $customer = Customer::create($customerPayload);
            $this->syncCustomerUser($customer, $validated);
            $this->syncCustomerKyc($customer, $kycPayload);

            return $customer->fresh(['kyc', 'user']);
        });
    }

    public function update(Customer $customer, array $validated): Customer
    {
        return DB::transaction(function () use ($customer, $validated) {
            $originalMobile = $customer->mobile;
            $originalEmail = $customer->email;
            $customerPayload = $validated;
            $kycPayload = $customerPayload['kyc'] ?? null;
            unset($customerPayload['kyc']);

            $customer->update($customerPayload);
            $this->syncCustomerUser($customer, $validated, $originalMobile, $originalEmail);
            $this->syncCustomerKyc($customer, $kycPayload);

            return $customer->fresh(['kyc', 'user']);
        });
    }

    public function delete(Customer $customer): void
    {
        $customer->delete();
    }

    public function syncCustomerUser(Customer $customer, array $validated, ?string $originalMobile = null, ?string $originalEmail = null): User
    {
        $user = $customer->user;

        if (! $user) {
            $user = User::query()
                ->where(function ($builder) use ($customer, $originalMobile, $originalEmail) {
                    $builder->where('mobile', $originalMobile ?: $customer->mobile);

                    if (! empty($originalEmail ?: $customer->email)) {
                        $builder->orWhere('email', $originalEmail ?: $customer->email);
                    }
                })
                ->first();
        }

        $password = $validated['portal_password'] ?? null;

        if (! $user) {
            $user = User::query()->create([
                'name' => $customer->name ?: 'Customer ' . $customer->mobile,
                'email' => $this->resolveUserEmail($customer, $user),
                'mobile' => $customer->mobile,
                'password' => Hash::make($password ?: $customer->mobile),
                'status' => $customer->status ?: 'active',
            ]);
        } else {
            $userPayload = [
                'name' => $customer->name ?: $user->name,
                'email' => $this->resolveUserEmail($customer, $user),
                'mobile' => $customer->mobile,
                'status' => $customer->status ?: $user->status,
            ];

            if ($password) {
                $userPayload['password'] = Hash::make($password);
            }

            $user->update($userPayload);
        }

        Role::findOrCreate('customer', 'web');
        $user->assignRole('customer');

        $branchId = $validated['branch_id'] ?? null;

        if ($branchId) {
            $user->branches()->sync([$branchId]);
        }

        $customer->updateQuietly([
            'user_id' => $user->id,
            'portal_enabled' => $validated['portal_enabled'] ?? true,
            'portal_enabled_at' => ($validated['portal_enabled'] ?? true) ? now() : null,
        ]);

        return $user;
    }

    private function resolveUserEmail(Customer $customer, ?User $user = null): string
    {
        if (! empty($customer->email)) {
            return $customer->email;
        }

        return $user?->email ?: sprintf('customer.%s@portal.local', preg_replace('/\D+/', '', $customer->mobile));
    }

    private function syncCustomerKyc(Customer $customer, ?array $kycPayload): void
    {
        if ($kycPayload === null) {
            return;
        }

        CustomerKyc::query()->updateOrCreate(
            ['customer_id' => $customer->id],
            [
                ...$kycPayload,
                'customer_id' => $customer->id,
            ]
        );
    }
}
