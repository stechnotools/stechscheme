// Type Imports
import type { HorizontalMenuDataType } from '@/types/menuTypes'
import type { getDictionary } from '@/utils/getDictionary'

const horizontalMenuData = (_dictionary: Awaited<ReturnType<typeof getDictionary>>): HorizontalMenuDataType[] => {
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
        { label: 'Add Branch', href: '/branches/add' },
        { label: 'Customer Master', href: '/customers' },
        { label: 'Add Customer', href: '/customers/add' },
        { label: 'Scheme Master', href: '/schemes' },
        { label: 'Create Scheme', href: '/schemes/create' },
        { label: 'Chart of Accounts', href: '/chart-of-accounts' }
      ]
    },
    {
      label: 'Membership',
      icon: 'ri-vip-crown-line',
      children: [
        { label: 'All Membership', href: '/membership/active' },
        { label: 'Create Membership', href: '/membership/create' }
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
      label: 'Feedback',
      icon: 'ri-feedback-line',
      children: [
        { label: 'Dashboard', href: '/feedback' },
        { label: 'Customer Master', href: '/customers' },
        { label: 'Add Customer', href: '/customers/add' },
        { label: 'Capture Kiosk', href: '/feedback/capture' },
        { label: 'Question Setup', href: '/feedback/questions' }
      ]
    },
    {
      label: 'Reports',
      icon: 'ri-file-chart-line',
      children: [
        { label: 'Revenue', href: '/reports/revenue' },
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
        { label: 'General setup', href: '/settings/general-settings' },
        { label: 'Company Info', href: '/settings/company-info' },
        { label: 'Payment Gateway', href: '/settings/payment-gateway' },
        { label: 'WhatsApp API', href: '/settings/whatsapp-api' },
        { label: 'Notifications', href: '/settings/notifications' }
      ]
    }
  ]
}

export default horizontalMenuData
