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
      label: 'Digital Metal',
      icon: 'ri-coin-line',
      children: [
        { label: 'Metal Master', href: '/digital-metal/master' },
        { label: 'Metal Rate', href: '/digital-metal/rates' },
        { label: 'DigiMetal Sale Entry', href: '/digital-metal/sales' },
        { label: 'Digital Metal Purchase', href: '/digital-metal/purchase' },
        { label: 'Customer Digital Balance Report', href: '/digital-metal/reports/balance' },
        { label: 'Metal Default Redeem Option List', href: '/digital-metal/redeem-options' },
        { label: 'Popular Buying Option', href: '/digital-metal/buying-options' }
      ]
    },
    {
      label: 'Gold SIP',
      icon: 'ri-vip-crown-line',
      children: [
        { label: 'Subscription Entry', href: '/subscriptions/create' },
        { label: 'Subscription List', href: '/subscriptions' }
      ]
    },

    {
      label: 'Loyalty Card',
      icon: 'ri-medal-line',
      children: [
        { label: 'Loyalty Point Add/Redeem', href: '/loyalty-card/add-redeem' },
        { label: 'Category Master', href: '/loyalty-card/category' },
        { label: 'Customer', href: '/loyalty-card/customers' },
        { label: 'Loyalty Setup Master', href: '/loyalty-card/setup' },
        { label: 'Sale Data Import', href: '/loyalty-card/sale-import' },
        {
          label: 'Loyalty Card Reports',
          children: [
            { label: 'Dashboard', href: '/loyalty-card/reports' },
            { label: 'Customer Loyalty Ledger', href: '/loyalty-card/reports/ledger' },
            { label: 'Card Category Wise Report', href: '/loyalty-card/reports/category-wise' },
            { label: 'Gift Achiver Report', href: '/loyalty-card/reports/gift-achiever' }
          ]
        }
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
        { label: 'Dashboard', href: '/reports/dashboard' },
        { label: 'Daily Collection', href: '/reports/daily-collection' },
        {
          label: 'Customer Reports',
          children: [
            { label: 'Customer Ledger', href: '/reports/customer-ledger' },
            { label: 'Customer Statement', href: '/reports/customer-statement' }
          ]
        },
        {
          label: 'Installment Reports',
          children: [
            { label: 'Pending Installment Report', href: '/reports/installments/pending' },
            { label: 'Overdue Installment Report', href: '/reports/installments/overdue' }
          ]
        },
        {
          label: 'Receipt Reports',
          children: [
            { label: 'Receipt Register', href: '/reports/receipts/register' }
          ]
        },
        {
          label: 'Branch Reports',
          children: [
            { label: 'Branch-wise Collection', href: '/reports/branches/collection' }
          ]
        },
        {
          label: 'Gold Reports',
          children: [
            { label: 'Gold Liability Report', href: '/reports/gold/liability' }
          ]
        },
        {
          label: 'Accounting Reports',
          children: [
            { label: 'Cash Book', href: '/reports/accounting/cash-book' },
            { label: 'Bank Book', href: '/reports/accounting/bank-book' },
            { label: 'Trial Balance', href: '/reports/accounting/trial-balance' },
            { label: 'Profit & Loss', href: '/reports/accounting/profit-loss' },
            { label: 'Balance Sheet', href: '/reports/accounting/balance-sheet' }
          ]
        }
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
        { label: 'Voucher setup', href: '/digital-metal/voucher-setup' },
        { label: 'Company Info', href: '/settings/company-info' },
        { label: 'Payment Gateway', href: '/settings/payment-gateway' },
        { label: 'WhatsApp Service Setup', href: '/settings/whatsapp-api' },
        { label: 'Notifications', href: '/settings/notifications' }
      ]
    }
  ]
}

export default verticalMenuData
