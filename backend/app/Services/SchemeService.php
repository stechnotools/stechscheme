<?php

namespace App\Services;

use App\Models\Scheme;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class SchemeService
{
    public function __construct(private readonly MembershipService $membershipService)
    {
    }

    private function preparePayload(array $validated): array
    {
        $schemeName = trim((string) ($validated['name'] ?? ''));

        if ($schemeName !== '') {
            $validated['effect_to_account'] = $schemeName;
            $validated['advance_closure_account'] = $schemeName;
        }

        if (request()->hasFile('banner_image')) {
            $path = request()->file('banner_image')->store('schemes/banners', 'public');
            $validated['banner_image_path'] = asset('storage/' . $path);
        }

        return $validated;
    }

    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = Scheme::query()->with(['maturityBenefits', 'memberships']);

        foreach (['scheme_type', 'allow_overdue'] as $field) {
            if (array_key_exists($field, $filters) && $filters[$field] !== null && $filters[$field] !== '') {
                $query->where($field, $filters[$field]);
            }
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('scheme_type', 'like', "%{$search}%");
            });
        }

        $perPage = max(1, min((int) ($filters['per_page'] ?? 15), 100));

        return $query->latest('id')->paginate($perPage);
    }

    public function create(array $validated): Scheme
    {
        $scheme = Scheme::create($this->preparePayload($validated));

        $this->syncSchemeChartOfAccount($scheme);

        return $scheme->fresh(['maturityBenefits', 'memberships']);
    }

    public function update(Scheme $scheme, array $validated): Scheme
    {
        $previousTotalInstallments = (int) $scheme->total_installments;

        DB::transaction(function () use ($scheme, $validated, $previousTotalInstallments) {
            $scheme->update($this->preparePayload($validated));
            $this->syncSchemeChartOfAccount($scheme);

            $newTotalInstallments = (int) $scheme->total_installments;

            if ($newTotalInstallments > $previousTotalInstallments) {
                $this->membershipService->extendInstallmentSchedulesForScheme($scheme, $newTotalInstallments);
            }
        });

        return $scheme->fresh(['maturityBenefits', 'memberships']);
    }

    private function syncSchemeChartOfAccount(Scheme $scheme): void
    {
        $schemeName = trim((string) $scheme->name);

        if ($schemeName === '') {
            return;
        }

        $account = app(AccountingLedgerService::class)->schemeLedger($scheme);
        $account->update(['is_active' => ! $scheme->is_closed]);
    }
}
