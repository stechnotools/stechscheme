<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $allPermissions = [
            'dashboard.overview',
            'dashboard.analytics',
            'branches.all',
            'branches.add',
            'salesman.all',
            'salesman.add',
            'customers.all',
            'customers.add',
            'kyc.pending',
            'kyc.approved',
            'kyc.rejected',
            'schemes.all',
            'schemes.create',
            'schemes.maturity-benefits',
            'membership.create',
            'membership.active',
            'membership.matured',
            'membership.redeemed',
            'membership.closed',
            'membership.opening',
            'installments.all',
            'installments.pending',
            'installments.paid',
            'installments.overdue',
            'payments.all',
            'payments.history',
            'payments.failed',
            'payments.receipt',
            'reports.revenue',
            'reports.customers',
            'reports.payments',
            'reports.dashboard',
            'reports.daily-collection',
            'reports.customer-ledger',
            'reports.customer-statement',
            'reports.installments.pending',
            'reports.installments.overdue',
            'reports.receipts.register',
            'reports.branches.collection',
            'reports.gold.liability',
            'reports.accounting.cash-book',
            'reports.accounting.bank-book',
            'reports.accounting.trial-balance',
            'reports.accounting.profit-loss',
            'reports.accounting.balance-sheet',
            'users.users',
            'users.roles',
            'users.permissions',
            'settings.company-info',
            'settings.payment-gateway',
            'settings.whatsapp-api',
            'settings.notifications',
            'lc.category',
            'lc.customers',
            'lc.setup',
            'lc.sale-import',
            'lc.add-redeem',
            'lc.reports',
            'lc.reports.dashboard',
            'lc.reports.ledger',
            'lc.reports.category-wise',
            'lc.reports.gift-achiever',
            'commission.manage',
            'accounts.chart-of-accounts',
            'feedback.dashboard',
            'feedback.capture',
            'feedback.questions',
            'dm.master',
            'dm.rates',
            'dm.sales',
            'dm.purchase',
            'dm.reports',
            'dm.redeem',
            'dm.buying',
            'dm.voucher-setup',
            'settings.general',
        ];

        foreach ($allPermissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $superAdminRole = Role::findOrCreate('super-admin', 'web');
        $adminRole = Role::findOrCreate('admin', 'web');
        $branchManagerRole = Role::findOrCreate('branch-manager', 'web');
        $staffRole = Role::findOrCreate('staff', 'web');
        $customerRole = Role::findOrCreate('customer', 'web');

        $superAdminRole->syncPermissions($allPermissions);
        $adminRole->syncPermissions($allPermissions);

        $staffPermissions = [
            'dashboard.overview',
            'branches.all',
            'branches.add',
            'salesman.all',
            'salesman.add',
            'customers.all',
            'customers.add',
            'kyc.pending',
            'kyc.approved',
            'kyc.rejected',
            'schemes.all',
            'schemes.create',
            'schemes.maturity-benefits',
            'membership.create',
            'membership.active',
            'membership.matured',
            'membership.redeemed',
            'membership.closed',
            'membership.opening',
            'installments.all',
            'installments.pending',
            'installments.paid',
            'installments.overdue',
            'payments.all',
            'payments.history',
            'payments.failed',
            'payments.receipt',
            'reports.revenue',
            'reports.customers',
            'reports.payments',
            'reports.dashboard',
            'reports.daily-collection',
            'reports.customer-ledger',
            'reports.customer-statement',
            'reports.installments.pending',
            'reports.installments.overdue',
            'reports.receipts.register',
            'reports.branches.collection',
            'reports.gold.liability',
            'lc.category',
            'lc.customers',
            'lc.setup',
            'lc.sale-import',
            'lc.add-redeem',
            'lc.reports',
            'lc.reports.dashboard',
            'lc.reports.ledger',
            'accounts.chart-of-accounts',
            'feedback.capture',
            'dm.master',
            'dm.rates',
            'dm.sales',
            'dm.purchase',
            'dm.reports',
            'dm.redeem',
            'dm.buying',
            'dm.voucher-setup',
        ];

        $cashierPermissions = [
            'dashboard.overview',
            'customers.all',
            'membership.active',
            'membership.matured',
            'schemes.all',
            'payments.all',
            'payments.history',
            'payments.receipt',
            'installments.all',
            'installments.pending',
            'installments.paid',
            'installments.overdue',
            'reports.daily-collection',
            'reports.customer-ledger',
            'reports.customer-statement',
            'reports.receipts.register',
            'lc.add-redeem',
            'lc.customers',
        ];

        $customerPermissions = [];

        $branchManagerPermissions = [
            'dashboard.overview',
            'branches.all',
            'salesman.all',
            'customers.all',
            'schemes.all',
            'membership.active',
            'membership.matured',
            'membership.redeemed',
            'installments.all',
            'installments.pending',
            'installments.overdue',
            'payments.all',
            'payments.history',
            'payments.receipt',
            'reports.dashboard',
            'reports.daily-collection',
            'reports.customer-ledger',
            'reports.customer-statement',
            'reports.installments.pending',
            'reports.installments.overdue',
            'reports.receipts.register',
            'reports.branches.collection',
            'reports.gold.liability',
        ];

        $cashierRole = Role::findOrCreate('cashier', 'web');

        $branchManagerRole->syncPermissions($branchManagerPermissions);
        $staffRole->syncPermissions($staffPermissions);
        $cashierRole->syncPermissions($cashierPermissions);
        $customerRole->syncPermissions($customerPermissions);
    }
}
