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
            'customers.all',
            'customers.add',
            'customers.profile',
            'kyc.pending',
            'kyc.approved',
            'kyc.rejected',
            'schemes.all',
            'schemes.create',
            'schemes.maturity-benefits',
            'membership.active',
            'membership.matured',
            'membership.redeemed',
            'membership.closed',
            'installments.all',
            'installments.pending',
            'installments.paid',
            'installments.overdue',
            'payments.all',
            'payments.history',
            'payments.failed',
            'payments.receipt',
            'catalog.products',
            'catalog.categories',
            'promotions.offers',
            'reports.revenue',
            'reports.customers',
            'reports.payments',
            'feedback.all',
            'feedback.pending',
            'feedback.resolved',
            'users.users',
            'users.roles',
            'users.permissions',
            'settings.company-info',
            'settings.payment-gateway',
            'settings.whatsapp-api',
            'settings.notifications',
        ];

        foreach ($allPermissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $superAdminRole = Role::findOrCreate('super-admin', 'web');
        $adminRole = Role::findOrCreate('admin', 'web');
        $staffRole = Role::findOrCreate('staff', 'web');
        $customerRole = Role::findOrCreate('customer', 'web');

        $superAdminRole->syncPermissions($allPermissions);
        $adminRole->syncPermissions($allPermissions);

        $staffPermissions = [
            'dashboard.overview',
            'branches.all',
            'branches.add',
            'customers.all',
            'customers.add',
            'customers.profile',
            'kyc.pending',
            'kyc.approved',
            'kyc.rejected',
            'schemes.all',
            'schemes.create',
            'schemes.maturity-benefits',
            'membership.active',
            'membership.matured',
            'membership.redeemed',
            'membership.closed',
            'installments.all',
            'installments.pending',
            'installments.paid',
            'installments.overdue',
            'payments.all',
            'payments.history',
            'payments.failed',
            'payments.receipt',
            'catalog.products',
            'catalog.categories',
            'promotions.offers',
            'reports.revenue',
            'reports.customers',
            'reports.payments',
            'feedback.all',
            'feedback.pending',
            'feedback.resolved',
        ];

        $customerPermissions = [
            'dashboard.overview',
            'customers.profile',
            'membership.active',
            'membership.matured',
            'membership.redeemed',
            'installments.paid',
            'installments.overdue',
            'payments.history',
            'payments.receipt',
            'feedback.all',
        ];

        $staffRole->syncPermissions($staffPermissions);
        $customerRole->syncPermissions($customerPermissions);
    }
}
