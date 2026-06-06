<?php

namespace App\Services;

use App\Models\ChartOfAccount;
use App\Models\Customer;
use App\Models\Scheme;

class AccountingLedgerService
{
    public function assetLedger(string $name, ?string $code = null): ChartOfAccount
    {
        return $this->ledger($name, 'Asset', $this->root('Assets', 'Asset'), 'system_asset', null, $code);
    }

    public function customerDepositLedger(Customer $customer): ChartOfAccount
    {
        $name = 'Customer-' . trim((string) ($customer->name ?: $customer->mobile ?: $customer->id));

        return $this->ledger(
            $name,
            'Liability',
            $this->ledger('Customer Deposits', 'Liability', $this->root('Liabilities', 'Liability'), 'system_group'),
            'customer_deposit',
            $customer->id,
            null,
            "Customer deposit ledger for {$name}"
        );
    }

    public function schemeLedger(Scheme $scheme): ChartOfAccount
    {
        return $this->ledger(
            trim((string) $scheme->name),
            'Liability',
            $this->ledger('Scheme Ledgers', 'Liability', $this->root('Liabilities', 'Liability'), 'system_group'),
            'scheme',
            $scheme->id,
            $scheme->code ?: null,
            $scheme->remarks
        );
    }

    public function incomeLedger(string $name): ChartOfAccount
    {
        return $this->ledger($name, 'Income', $this->root('Income', 'Income'), 'system_income');
    }

    private function root(string $name, string $accountType): ChartOfAccount
    {
        return $this->ledger($name, $accountType, null, 'system_root');
    }

    private function ledger(
        string $name,
        string $accountType,
        ?ChartOfAccount $parent = null,
        ?string $sourceType = null,
        ?int $sourceId = null,
        ?string $code = null,
        ?string $remarks = null
    ): ChartOfAccount {
        $sourceType ??= 'system';
        $name = trim($name);

        $query = ChartOfAccount::query()->where('source_type', $sourceType);

        if ($sourceId === null) {
            $query->whereNull('source_id')->where('name', $name);
        } else {
            $query->where('source_id', $sourceId);
        }

        $account = $query->first();

        $payload = [
            'parent_id' => $parent?->id,
            'name' => $name,
            'code' => $code,
            'account_type' => $accountType,
            'is_active' => true,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'remarks' => $remarks,
        ];

        if ($account) {
            $account->fill($payload)->save();

            return $account;
        }

        return ChartOfAccount::query()->create($payload);
    }
}
