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
      label: "Today's Metal Rate",
      icon: 'ri-funds-line',
      children: [
        { label: 'Metal Master', href: '/metal-rates/master' },
        { label: 'Metal Rate', href: '/metal-rates' }
      ]
    },
    {
      label: 'Digital Metal',
      icon: 'ri-coin-line',
      children: [
        { label: 'Metal Master', href: '/digital-metal/master' },
        { label: 'Metal Rate', href: '/digital-metal/rates' },
        { label: 'DigiMetal Sale Entry', href: '/digital-metal/sales' },
        { label: 'Digital Metal Purchase', href: '/digital-metal/purchase' },
        { label: 'Customer Digital Balance Report', href: '/digital-metal/reports/balance' },
        { label: 'Metal Defult Redeem Option List', href: '/digital-metal/redeem-options' },
        { label: 'Popular Buying Option', href: '/digital-metal/buying-options' },
        { label: 'Voucher setup', href: '/digital-metal/voucher-setup' }
      ]
    },
    {
      label: 'Gold SIP',
      icon: 'ri-vip-crown-line',
      children: [
        { label: 'New Enrollment', href: '/subscriptions/create' },
        { label: 'Subscription List', href: '/subscriptions' }
      ]
    },
    {
      label: 'Scheme Entry',
      icon: 'ri-file-list-3-line',
      children: [
        { label: 'Redeem Entry', href: '/subscriptions/redeemed' },
        { label: 'Closing Entry', href: '/subscriptions/closed' }
      ]
    },
    {
      label: 'Payments',
      icon: 'ri-secure-payment-line',
      children: [
        { label: 'All Payments', href: '/payments' },
        { label: 'Failed Payments', href: '/payments/failed' }
      ]
    },
    {
      label: 'Feedback',
      icon: 'ri-feedback-line',
      children: [
        { label: 'Dashboard', href: '/feedback' },
        { label: 'Customer Master', href: '/customers' },
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
        { label: 'WhatsApp Service Setup', href: '/settings/whatsapp-api' },
        { label: 'Notifications', href: '/settings/notifications' }
      ]
    }
  ]
}

export default verticalMenuData
