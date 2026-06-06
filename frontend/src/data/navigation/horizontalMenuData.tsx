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
        { label: 'Create Membership', href: '/membership/create' },
        { label: 'Scheme Lifecycle', href: '/subscriptions/lifecycle' }
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
        { label: 'Company Info', href: '/settings/company-info' },
        { label: 'Payment Gateway', href: '/settings/payment-gateway' },
        { label: 'WhatsApp API', href: '/settings/whatsapp-api' },
        { label: 'Notifications', href: '/settings/notifications' }
      ]
    }
  ]
}

export default horizontalMenuData
