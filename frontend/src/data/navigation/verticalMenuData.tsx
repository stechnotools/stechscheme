// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'
import type { getDictionary } from '@/utils/getDictionary'

const verticalMenuData = (_dictionary: Awaited<ReturnType<typeof getDictionary>>): VerticalMenuDataType[] => {
  void _dictionary

  return [
    {
      label: 'Dashboard',
      icon: 'ri-home-smile-line',
      href: '/'
    },
    {
      label: 'Masters',
      icon: 'ri-folder-user-line',
      children: [
        { label: 'Branch Master', href: '/branches', permission: 'branches.all' },
        { label: 'Salesman Master', href: '/salesmen', permission: 'salesman.all' },
        { label: 'Customer Master', href: '/customers', permission: 'customers.all' },
        { label: 'Scheme Master', href: '/schemes', permission: 'schemes.all' },
        { label: 'Product Master', href: '/products', permission: 'products.all' },
        { label: 'Chart of Accounts', href: '/chart-of-accounts', permission: 'accounts.chart-of-accounts' }
      ]
    },

    {
      label: 'Digital Metal',
      icon: 'ri-coin-line',
      children: [
        { label: 'Metal Master', href: '/digital-metal/master', permission: 'dm.master' },
        { label: 'Metal Rate', href: '/digital-metal/rates', permission: 'dm.rates' },
        { label: 'DigiMetal Sale Entry', href: '/digital-metal/sales', permission: 'dm.sales' },
        { label: 'Digital Metal Purchase', href: '/digital-metal/purchase', permission: 'dm.purchase' },
        { label: 'Customer Digital Balance Report', href: '/digital-metal/reports/balance', permission: 'dm.reports' },
        { label: 'Metal Default Redeem Option List', href: '/digital-metal/redeem-options', permission: 'dm.redeem' },
        { label: 'Popular Buying Option', href: '/digital-metal/buying-options', permission: 'dm.buying' }
      ]
    },
    {
      label: 'Membership',
      icon: 'ri-vip-crown-line',
      children: [
        { label: 'Membership Entry', href: '/membership/create', permission: 'membership.create' },
        { label: 'Membership List', href: '/membership', permission: 'membership.active' },
        { label: 'Scheme Opening Entry', href: '/membership/opening', permission: 'membership.opening' }
      ]
    },

    {
      label: 'Loyalty Card',
      icon: 'ri-medal-line',
      children: [
        { label: 'Loyalty Point Add/Redeem', href: '/loyalty-card/add-redeem', permission: 'lc.add-redeem' },
        { label: 'Category Master', href: '/loyalty-card/category', permission: 'lc.category' },
        { label: 'Customer', href: '/loyalty-card/customers', permission: 'lc.customers' },
        { label: 'Loyalty Setup Master', href: '/loyalty-card/setup', permission: 'lc.setup' },
        { label: 'Sale Data Import', href: '/loyalty-card/sale-import', permission: 'lc.sale-import' },
        {
          label: 'Loyalty Card Reports',
          children: [
            { label: 'Dashboard', href: '/loyalty-card/reports', permission: 'lc.reports.dashboard' },
            { label: 'Customer Loyalty Ledger', href: '/loyalty-card/reports/ledger', permission: 'lc.reports.ledger' },
            { label: 'Card Category Wise Report', href: '/loyalty-card/reports/category-wise', permission: 'lc.reports.category-wise' },
            { label: 'Gift Achiver Report', href: '/loyalty-card/reports/gift-achiever', permission: 'lc.reports.gift-achiever' }
          ]
        }
      ]
    },
    {
      label: 'Feedback',
      icon: 'ri-feedback-line',
      children: [
        { label: 'Dashboard', href: '/feedback', permission: 'feedback.dashboard' },
        { label: 'Customer Master', href: '/customers', permission: 'customers.all' },
        { label: 'Capture Kiosk', href: '/feedback/capture', permission: 'feedback.capture' },
        { label: 'Question Setup', href: '/feedback/questions', permission: 'feedback.questions' }
      ]
    },
    {
      label: 'Reports',
      icon: 'ri-file-chart-line',
      children: [
        { label: 'Dashboard', href: '/reports/dashboard', permission: 'reports.dashboard' },
        { label: 'Daily Collection', href: '/reports/daily-collection', permission: 'reports.daily-collection' },
        {
          label: 'Customer Reports',
          children: [
            { label: 'Customer Ledger', href: '/reports/customer-ledger', permission: 'reports.customer-ledger' },
            { label: 'Customer Statement', href: '/reports/customer-statement', permission: 'reports.customer-statement' }
          ]
        },
        {
          label: 'Installment Reports',
          children: [
            { label: 'Pending Installment Report', href: '/reports/installments/pending', permission: 'reports.installments.pending' },
            { label: 'Overdue Installment Report', href: '/reports/installments/overdue', permission: 'reports.installments.overdue' }
          ]
        },
        {
          label: 'Receipt Reports',
          children: [
            { label: 'Receipt Register', href: '/reports/receipts/register', permission: 'reports.receipts.register' }
          ]
        },
        {
          label: 'Branch Reports',
          children: [
            { label: 'Branch-wise Collection', href: '/reports/branches/collection', permission: 'reports.branches.collection' }
          ]
        },
        {
          label: 'Gold Reports',
          children: [
            { label: 'Gold Liability Report', href: '/reports/gold/liability', permission: 'reports.gold.liability' }
          ]
        },
        {
          label: 'Accounting Reports',
          children: [
            { label: 'Cash Book', href: '/reports/accounting/cash-book', permission: 'reports.accounting.cash-book' },
            { label: 'Bank Book', href: '/reports/accounting/bank-book', permission: 'reports.accounting.bank-book' },
            { label: 'Trial Balance', href: '/reports/accounting/trial-balance', permission: 'reports.accounting.trial-balance' },
            { label: 'Profit & Loss', href: '/reports/accounting/profit-loss', permission: 'reports.accounting.profit-loss' },
            { label: 'Balance Sheet', href: '/reports/accounting/balance-sheet', permission: 'reports.accounting.balance-sheet' }
          ]
        },
        { label: 'Commission Ledger', href: '/commission/ledger', permission: 'commission.manage' }
      ]
    },
    {
      label: 'Users & Roles',
      icon: 'ri-team-line',
      children: [
        { label: 'Users', href: '/users', permission: 'users.users' },
        { label: 'Roles', href: '/roles', permission: 'users.roles' },
        { label: 'Permissions', href: '/permissions', permission: 'users.permissions' }
      ]
    },
    {
      label: 'Settings',
      icon: 'ri-settings-3-line',
      children: [
        { label: 'General setup', href: '/settings/general-settings', permission: 'settings.general' },
        { label: 'Voucher setup', href: '/digital-metal/voucher-setup', permission: 'dm.voucher-setup' },
        { label: 'Company Info', href: '/settings/company-info', permission: 'settings.company-info' },
        { label: 'Payment Gateway', href: '/settings/payment-gateway', permission: 'settings.payment-gateway' },
        { label: 'WhatsApp Service Setup', href: '/settings/whatsapp-api', permission: 'settings.whatsapp-api' },
        { label: 'Notifications', href: '/settings/notifications', permission: 'settings.notifications' },
        { label: 'Commission Setup', href: '/commission/rules', permission: 'commission.manage' }
      ]
    }
  ]
}

export default verticalMenuData
