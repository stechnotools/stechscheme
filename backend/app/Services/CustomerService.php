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
    private static ?string $lastGeneratedLoyaltyCardNo = null;
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
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('loyalty_card_no', 'ilike', "%{$search}%");
            });
        }

        $sortBy = (string) ($filters['sort_by'] ?? 'id');
        $sortBy = in_array($sortBy, ['id', 'name', 'mobile', 'loyalty_card_no', 'created_at', 'updated_at'], true)
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

            // Auto-generate unique loyalty card number if not provided
            if (empty($customerPayload['loyalty_card_no'])) {
                $customerPayload['loyalty_card_no'] = $this->generateUniqueLoyaltyCardNo();
            }

            // Every customer gets a unique customer_code — this is the stable
            // identifier to rely on now that mobile is optional.
            if (empty($customerPayload['customer_code'])) {
                $customerPayload['customer_code'] = $this->generateUniqueCustomerCode();
            }

            $kycPayload = $customerPayload['kyc'] ?? null;
            unset($customerPayload['kyc']);

            // Initialize balance with opening points
            if (isset($customerPayload['opening_points'])) {
                $customerPayload['loyalty_points_balance'] = $customerPayload['opening_points'];
                $customerPayload['lifetime_points'] = $customerPayload['opening_points'];
            }

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

            // Auto-generate unique loyalty card number if not provided
            if (empty($customerPayload['loyalty_card_no']) && empty($customer->loyalty_card_no)) {
                $customerPayload['loyalty_card_no'] = $this->generateUniqueLoyaltyCardNo();
            }

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

        $lookupMobile = $originalMobile ?: $customer->mobile;
        $lookupEmail = $originalEmail ?: $customer->email;

        // Only look up by mobile/email when at least one is actually present —
        // where('mobile', null) compiles to whereNull('mobile') in Laravel, which
        // would otherwise match (and incorrectly reuse) the first user with no
        // mobile number at all.
        if (! $user && (! empty($lookupMobile) || ! empty($lookupEmail))) {
            $user = User::query()
                ->where(function ($builder) use ($lookupMobile, $lookupEmail) {
                    if (! empty($lookupMobile)) {
                        $builder->where('mobile', $lookupMobile);
                    }

                    if (! empty($lookupEmail)) {
                        $builder->orWhere('email', $lookupEmail);
                    }
                })
                ->first();
        }

        $password = $validated['portal_password'] ?? null;

        if (! $user) {
            $user = User::query()->create([
                'name' => $customer->name ?: 'Customer ' . ($customer->mobile ?: $customer->customer_code),
                'email' => $this->resolveUserEmail($customer, $user),
                'mobile' => $customer->mobile,
                'password' => Hash::make($password ?: $customer->mobile ?: \Illuminate\Support\Str::random(16)),
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

        if ($user?->email) {
            return $user->email;
        }

        $identifier = $customer->mobile ? preg_replace('/\D+/', '', $customer->mobile) : strtolower($customer->customer_code ?: \Illuminate\Support\Str::random(8));

        return sprintf('customer.%s@portal.local', $identifier);
    }

    public function regenerateLoyaltyCard(Customer $customer): Customer
    {
        $newCardNo = $this->generateUniqueLoyaltyCardNo();
        $customer->update(['loyalty_card_no' => $newCardNo]);

        return $customer->fresh();
    }

    public function generateUniqueLoyaltyCardNo(): string
    {
        if (self::$lastGeneratedLoyaltyCardNo !== null) {
            $nextNo = sprintf('%.0f', (float) self::$lastGeneratedLoyaltyCardNo + 1);
            while (Customer::query()->where('loyalty_card_no', $nextNo)->exists()) {
                $nextNo = sprintf('%.0f', (float) $nextNo + 1);
            }
            self::$lastGeneratedLoyaltyCardNo = $nextNo;
            return $nextNo;
        }

        // Using numeric casting for accurate max value in PostgreSQL
        $maxCardNo = Customer::query()
            ->whereRaw("loyalty_card_no ~ '^[0-9]{10,}$' ")
            ->selectRaw("MAX(CAST(loyalty_card_no AS BIGINT)) as max_no")
            ->value('max_no');

        if (! $maxCardNo) {
            $nextNo = '1000000001';
        } else {
            $nextNo = sprintf('%.0f', (float) $maxCardNo + 1);
        }

        // Final safety check against any collision
        while (Customer::query()->where('loyalty_card_no', $nextNo)->exists()) {
            $nextNo = sprintf('%.0f', (float) $nextNo + 1);
        }

        self::$lastGeneratedLoyaltyCardNo = $nextNo;
        return $nextNo;
    }

    public function generateUniqueCustomerCode(): string
    {
        do {
            $code = (string) random_int(100000, 999999);
        } while (Customer::query()->where('customer_code', $code)->exists());

        return $code;
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
