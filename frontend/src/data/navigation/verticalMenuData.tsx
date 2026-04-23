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
    label: 'Masters',
    icon: 'ri-folder-user-line',
    children: [
      { label: 'Branch Master', href: '/branches' },
      { label: 'Customer Master', href: '/customers' },
      { label: 'Scheme Master', href: '/schemes' },
      { label: 'Chart of Accounts', href: '/chart-of-accounts' }
    ]
  },
  {
    label: 'Scheme Entry',
    icon: 'ri-file-list-3-line',
    children: [
      { label: 'Deposit Entry', href: '/payments/collect' },
      { label: 'Redeem Entry', href: '/membership/redeemed' },
      { label: 'Closing Entry', href: '/membership/closed' }
    ]
  },
  {
    label: 'Payments',
    icon: 'ri-secure-payment-line',
    children: [
      { label: 'All Payments', href: '/payments' },
      { label: 'Create Payment', href: '/payments/create' }
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
