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

    public function expenseLedger(string $name): ChartOfAccount
    {
        return $this->ledger($name, 'Expense', $this->root('Expenses', 'Expense'), 'system_expense');
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
            'account_type' => $accountType,
            'is_active' => true,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'remarks' => $remarks,
        ];

        // Only touch `code` when one was explicitly supplied — otherwise an
        // update pass with no code would silently blank out a previously
        // auto-generated one.
        if ($code !== null) {
            $payload['code'] = $code;
        }

        if ($account) {
            $account->fill($payload)->save();
        } else {
            $account = ChartOfAccount::query()->create($payload);
        }

        if (! $account->code) {
            $account->code = $this->generateCode($account);
            $account->save();
        }

        return $account;
    }

    private function generateCode(ChartOfAccount $account): string
    {
        $prefix = match ($account->account_type) {
            'Asset' => 'AST',
            'Liability' => 'LIA',
            'Income' => 'INC',
            'Expense' => 'EXP',
            default => 'GEN',
        };

        return $prefix . '-' . str_pad((string) $account->id, 3, '0', STR_PAD_LEFT);
    }
}
