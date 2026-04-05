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
      { id: 'dashboard-overview', label: 'Overview', href: '/', permission: 'dashboard.overview', roles: ['super-admin', 'admin', 'staff', 'customer'] },
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
    id: 'branches',
    label: 'Branches',
    icon: 'ri-building-4-line',
    roles: ['super-admin', 'admin', 'staff'],
    children: [
      { id: 'branches-all', label: 'All Branches', href: '/branches', permission: 'branches.all', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'branches-add', label: 'Add Branch', href: '/branches/add', permission: 'branches.add', roles: ['super-admin', 'admin', 'staff'] }
    ]
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: 'ri-group-line',
    children: [
      { id: 'customers-all', label: 'All Customers', href: '/customers', permission: 'customers.all', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'customers-add', label: 'Add Customer', href: '/customers/add', permission: 'customers.add', roles: ['super-admin', 'admin', 'staff'] },
      {
        id: 'customers-profile',
        label: 'Customer Profile',
        href: '/customers/profile',
        permission: 'customers.profile',
        roles: ['super-admin', 'admin', 'staff', 'customer']
      }
    ]
  },
  {
    id: 'kyc',
    label: 'KYC',
    icon: 'ri-shield-check-line',
    roles: ['super-admin', 'admin', 'staff'],
    children: [
      { id: 'kyc-pending', label: 'Pending', href: '/kyc/pending', permission: 'kyc.pending', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'kyc-approved', label: 'Approved', href: '/kyc/approved', permission: 'kyc.approved', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'kyc-rejected', label: 'Rejected', href: '/kyc/rejected', permission: 'kyc.rejected', roles: ['super-admin', 'admin', 'staff'] }
    ]
  },
  {
    id: 'schemes',
    label: 'Schemes',
    icon: 'ri-medal-line',
    roles: ['super-admin', 'admin', 'staff'],
    children: [
      { id: 'schemes-all', label: 'All Schemes', href: '/schemes', permission: 'schemes.all', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'schemes-create', label: 'Create Scheme', href: '/schemes/create', permission: 'schemes.create', roles: ['super-admin', 'admin', 'staff'] },
      {
        id: 'schemes-maturity',
        label: 'Maturity Benefits',
        href: '/schemes/maturity-benefits',
        permission: 'schemes.maturity-benefits',
        roles: ['super-admin', 'admin', 'staff']
      }
    ]
  },
  {
    id: 'membership',
    label: 'Membership',
    icon: 'ri-vip-crown-line',
    children: [
      { id: 'membership-active', label: 'Active', href: '/membership/active', permission: 'membership.active', roles: ['super-admin', 'admin', 'staff', 'customer'] },
      { id: 'membership-matured', label: 'Matured', href: '/membership/matured', permission: 'membership.matured', roles: ['super-admin', 'admin', 'staff', 'customer'] },
      { id: 'membership-redeemed', label: 'Redeemed', href: '/membership/redeemed', permission: 'membership.redeemed', roles: ['super-admin', 'admin', 'staff', 'customer'] },
      { id: 'membership-closed', label: 'Closed', href: '/membership/closed', permission: 'membership.closed', roles: ['super-admin', 'admin', 'staff'] }
    ]
  },
  {
    id: 'installments',
    label: 'Installments',
    icon: 'ri-calendar-check-line',
    children: [
      { id: 'installments-all', label: 'All', href: '/installments', permission: 'installments.all', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'installments-pending', label: 'Pending', href: '/installments/pending', permission: 'installments.pending', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'installments-paid', label: 'Paid', href: '/installments/paid', permission: 'installments.paid', roles: ['super-admin', 'admin', 'staff', 'customer'] },
      { id: 'installments-overdue', label: 'Overdue', href: '/installments/overdue', permission: 'installments.overdue', roles: ['super-admin', 'admin', 'staff', 'customer'] }
    ]
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: 'ri-secure-payment-line',
    children: [
      { id: 'payments-all', label: 'All Payments', href: '/payments', permission: 'payments.all', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'payments-history', label: 'Payment History', href: '/payments/history', permission: 'payments.history', roles: ['super-admin', 'admin', 'staff', 'customer'] },
      { id: 'payments-failed', label: 'Failed', href: '/payments/failed', permission: 'payments.failed', roles: ['super-admin', 'admin', 'staff'] },
      {
        id: 'payments-receipt',
        label: 'Receipt / Deposit Slip',
        href: '/payments/receipt',
        permission: 'payments.receipt',
        roles: ['super-admin', 'admin', 'staff', 'customer']
      }
    ]
  },
  {
    id: 'catalog',
    label: 'Catalog',
    icon: 'ri-price-tag-3-line',
    roles: ['super-admin', 'admin', 'staff'],
    children: [
      { id: 'catalog-products', label: 'Products', href: '/catalog/products', permission: 'catalog.products', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'catalog-categories', label: 'Categories', href: '/catalog/categories', permission: 'catalog.categories', roles: ['super-admin', 'admin', 'staff'] }
    ]
  },
  {
    id: 'promotions',
    label: 'Promotions',
    icon: 'ri-megaphone-line',
    roles: ['super-admin', 'admin', 'staff'],
    children: [{ id: 'promotions-offers', label: 'Offers', href: '/promotions/offers', permission: 'promotions.offers', roles: ['super-admin', 'admin', 'staff'] }]
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
    id: 'feedback',
    label: 'Feedback',
    icon: 'ri-message-2-line',
    children: [
      { id: 'feedback-all', label: 'All Feedback', href: '/feedback', permission: 'feedback.all', roles: ['super-admin', 'admin', 'staff', 'customer'] },
      { id: 'feedback-pending', label: 'Pending', href: '/feedback/pending', permission: 'feedback.pending', roles: ['super-admin', 'admin', 'staff'] },
      { id: 'feedback-resolved', label: 'Resolved', href: '/feedback/resolved', permission: 'feedback.resolved', roles: ['super-admin', 'admin', 'staff'] }
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
