export type AppRole = 'super-admin' | 'admin' | 'staff' | 'customer'

export type JewelleryMenuItem = {
  id: string
  label: string
  icon?: string
  href?: string
  permission?: string
  roles?: AppRole[]
  children?: JewelleryMenuItem[]
}

export const jewelleryMenuItems: JewelleryMenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'ri-dashboard-line',
    children: [
      { id: 'dashboard-overview', label: 'Overview', href: '/', permission: 'dashboard.overview', roles: ['super-admin', 'admin', 'staff'] },
      {
        id: 'dashboard-analytics',
        label: 'Analytics',
        href: '/dashboards/analytics',
        permission: 'dashboard.analytics',
        roles: ['super-admin', 'admin']
      }
    ]
  },
  {
    id: 'masters',
    label: 'Masters',
    icon: 'ri-folder-user-line',
    roles: ['super-admin', 'admin', 'staff'],
    children: [
      { id: 'branches-all', label: 'Branch Master', href: '/branches', permission: 'branches.all', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'branches-add', label: 'Add Branch', href: '/branches/add', permission: 'branches.add', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'customers-all', label: 'Customer Master', href: '/customers', permission: 'customers.all', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'customers-add', label: 'Add Customer', href: '/customers/add', permission: 'customers.add', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'schemes-all', label: 'Scheme Master', href: '/schemes', permission: 'schemes.all', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'schemes-create', label: 'Create Scheme', href: '/schemes/create', permission: 'schemes.create', roles: ['super-admin', 'admin', 'staff'] },
      {
        id: 'accounts-chart-of-accounts',
        label: 'Chart of Accounts',
        href: '/chart-of-accounts',
        permission: 'accounts.chart-of-accounts',
        roles: ['super-admin', 'admin', 'staff']
      }
    ]
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    icon: 'ri-vip-crown-line',
    children: [
      { id: 'subscriptions-all', label: 'Subscription Master', href: '/subscriptions', permission: 'membership.active', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'subscriptions-create', label: 'Create Subscription', href: '/subscriptions/create', permission: 'membership.create', roles: ['super-admin', 'admin', 'staff'] }
    ]
  },
  {
    id: 'installments',
    label: 'Installments',
    icon: 'ri-calendar-check-line',
    children: [
      { id: 'installments-all', label: 'All', href: '/installments', permission: 'installments.all', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'installments-pending', label: 'Pending', href: '/installments/pending', permission: 'installments.pending', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'installments-paid', label: 'Paid', href: '/installments/paid', permission: 'installments.paid', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'installments-overdue', label: 'Overdue', href: '/installments/overdue', permission: 'installments.overdue', roles: ['super-admin', 'admin', 'staff'] }
    ]
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: 'ri-secure-payment-line',
    children: [
      { id: 'payments-all', label: 'All Payments', href: '/payments', permission: 'payments.all', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'payments-history', label: 'Deposit Entry', href: '/payments/history', permission: 'payments.history', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'payments-failed', label: 'Failed', href: '/payments/failed', permission: 'payments.failed', roles: ['super-admin', 'admin', 'staff'] },
      {
        id: 'payments-receipt',
        label: 'Receipts',
        href: '/payments/receipt',
        permission: 'payments.receipt',
        roles: ['super-admin', 'admin', 'staff']
      }
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'ri-file-chart-line',
    roles: ['super-admin', 'admin', 'staff'],
    children: [
      { id: 'reports-revenue', label: 'Revenue', href: '/reports/revenue', permission: 'reports.revenue', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'reports-customers', label: 'Customers', href: '/reports/customers', permission: 'reports.customers', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'reports-payments', label: 'Payments', href: '/reports/payments', permission: 'reports.payments', roles: ['super-admin', 'admin', 'staff'] }
    ]
  },
  {
    id: 'users-roles',
    label: 'Users & Roles',
    icon: 'ri-team-line',
    roles: ['super-admin', 'admin'],
    children: [
      { id: 'users', label: 'Users', href: '/apps/user/list', permission: 'users.users', roles: ['super-admin', 'admin'] },
      { id: 'roles', label: 'Roles', href: '/apps/roles', permission: 'users.roles', roles: ['super-admin', 'admin'] },
      { id: 'permissions', label: 'Permissions', href: '/apps/permissions', permission: 'users.permissions', roles: ['super-admin', 'admin'] }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'ri-settings-3-line',
    roles: ['super-admin', 'admin'],
    children: [
      { id: 'settings-company', label: 'Company Info', href: '/settings/company-info', permission: 'settings.company-info', roles: ['super-admin', 'admin'] },
      { id: 'settings-payment-gateway', label: 'Payment Gateway', href: '/settings/payment-gateway', permission: 'settings.payment-gateway', roles: ['super-admin', 'admin'] },
      { id: 'settings-whatsapp', label: 'WhatsApp API', href: '/settings/whatsapp-api', permission: 'settings.whatsapp-api', roles: ['super-admin', 'admin'] },
      { id: 'settings-notifications', label: 'Notifications', href: '/settings/notifications', permission: 'settings.notifications', roles: ['super-admin', 'admin'] }
    ]
  }
]
