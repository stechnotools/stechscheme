// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'
import type { getDictionary } from '@/utils/getDictionary'

const verticalMenuData = (_dictionary: Awaited<ReturnType<typeof getDictionary>>): VerticalMenuDataType[] => {
  void _dictionary

  return [
  {
    label: 'Dashboard',
    icon: 'ri-home-smile-line',
    children: [
      { label: 'Overview', href: '/' },
      { label: 'Analytics', href: '/dashboards/analytics' }
    ]
  },
  {
    label: 'Branches',
    icon: 'ri-building-4-line',
    children: [
      { label: 'All Branches', href: '/branches' },
      { label: 'Add Branch', href: '/branches/add' }
    ]
  },
  {
    label: 'Customers',
    icon: 'ri-group-line',
    children: [
      { label: 'All Customers', href: '/customers' },
      { label: 'Add Customer', href: '/customers/add' }
    ]
  },
  {
    label: 'KYC',
    icon: 'ri-shield-check-line',
    children: [
      { label: 'Pending', href: '/kyc/pending' },
      { label: 'Approved', href: '/kyc/approved' },
      { label: 'Rejected', href: '/kyc/rejected' }
    ]
  },
  {
    label: 'Schemes',
    icon: 'ri-medal-line',
    children: [
      { label: 'All Schemes', href: '/schemes' },
      { label: 'Create Scheme', href: '/schemes/create' }
    ]
  },
  {
    label: 'Accounts',
    icon: 'ri-bank-card-line',
    children: [{ label: 'Chart of Accounts', href: '/chart-of-accounts' }]
  },
  {
    label: 'Membership',
    icon: 'ri-vip-crown-line',
    children: [
      { label: 'Create Membership', href: '/membership/create' },
      { label: 'Active', href: '/membership/active' },
      { label: 'Matured', href: '/membership/matured' },
      { label: 'Redeemed', href: '/membership/redeemed' },
      { label: 'Closed', href: '/membership/closed' }
    ]
  },
  {
    label: 'Installments',
    icon: 'ri-calendar-check-line',
    children: [
      { label: 'All', href: '/installments' },
      { label: 'Pending', href: '/installments/pending' },
      { label: 'Paid', href: '/installments/paid' },
      { label: 'Overdue', href: '/installments/overdue' }
    ]
  },
  {
    label: 'Payments',
    icon: 'ri-secure-payment-line',
    children: [
      { label: 'All Payments', href: '/payments' },
      { label: 'Payment History', href: '/payments/history' },
      { label: 'Failed', href: '/payments/failed' },
      { label: 'Receipts', href: '/payments/receipt' }
    ]
  },
  {
    label: 'Reports',
    icon: 'ri-file-chart-line',
    children: [
      { label: 'Revenue', href: '/reports/revenue' },
      { label: 'Customers', href: '/reports/customers' },
      { label: 'Payments', href: '/reports/payments' }
    ]
  },
  {
    label: 'Users & Roles',
    icon: 'ri-team-line',
    children: [
      { label: 'Users', href: '/apps/user/list' },
      { label: 'Roles', href: '/apps/roles' },
      { label: 'Permissions', href: '/apps/permissions' }
    ]
  },
  {
    label: 'Settings',
    icon: 'ri-settings-3-line',
    children: [
      { label: 'Company Info', href: '/settings/company-info' },
      { label: 'Payment Gateway', href: '/settings/payment-gateway' },
      { label: 'WhatsApp API', href: '/settings/whatsapp-api' },
      { label: 'Notifications', href: '/settings/notifications' }
    ]
  }
  ]
}

export default verticalMenuData
