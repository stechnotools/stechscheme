<?php

use App\Models\ChartOfAccount;
use App\Models\Customer;
use App\Models\Scheme;
use App\Services\AccountingLedgerService;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        $ledgerService = app(AccountingLedgerService::class);

        $ledgerService->assetLedger('Cash In Hand');
        $ledgerService->assetLedger('SBI Bank');
        $ledgerService->assetLedger('HDFC Bank');
        $ledgerService->assetLedger('UPI Collection');

        $ledgerService->incomeLedger('Late Fee Income');
        $ledgerService->incomeLedger('Membership Fee Income');

        $expenseRoot = $this->ledger('Expense', 'Expense', null, 'system_root');
        $this->ledger('Salary Expense', 'Expense', $expenseRoot, 'system_expense');
        $this->ledger('Rent Expense', 'Expense', $expenseRoot, 'system_expense');
        $this->ledger('Electricity Expense', 'Expense', $expenseRoot, 'system_expense');

        Customer::query()->orderBy('id')->chunkById(200, function ($customers) use ($ledgerService) {
            foreach ($customers as $customer) {
                $ledgerService->customerDepositLedger($customer);
            }
        });

        Scheme::query()->orderBy('id')->chunkById(200, function ($schemes) use ($ledgerService) {
            foreach ($schemes as $scheme) {
                $ledgerService->schemeLedger($scheme);
            }
        });
    }

    public function down(): void
    {
        // Non-destructive sync migration. Ledgers may be referenced by vouchers.
    }

    private function ledger(string $name, string $accountType, ?ChartOfAccount $parent, string $sourceType): ChartOfAccount
    {
        return ChartOfAccount::query()->firstOrCreate(
            [
                'source_type' => $sourceType,
                'source_id' => null,
                'name' => $name,
            ],
            [
                'parent_id' => $parent?->id,
                'code' => null,
                'account_type' => $accountType,
                'is_active' => true,
                'remarks' => null,
            ]
        );
    }
};
