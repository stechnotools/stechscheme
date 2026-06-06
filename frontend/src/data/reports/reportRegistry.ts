export type ReportPath =
  | 'dashboard'
  | 'daily-collection'
  | 'customer-ledger'
  | 'customer-statement'
  | 'installments/pending'
  | 'installments/overdue'
  | 'receipts/register'
  | 'branches/collection'
  | 'gold/liability'
  | 'accounting/cash-book'
  | 'accounting/bank-book'
  | 'accounting/trial-balance'
  | 'accounting/profit-loss'
  | 'accounting/balance-sheet'

export type ReportItem = {
  path: ReportPath
  title: string
  permission: string
  summary: string
  columns: string[]
  filters: string[]
  scope: 'dashboard' | 'operational' | 'financial'
}

export type ReportSection = {
  title: string
  description: string
  scope: ReportItem['scope']
  items: ReportItem[]
}

export const reportSections: ReportSection[] = [
  {
    title: 'Dashboard Reports',
    description: 'Fast operational checks for collections and overdue risk.',
    scope: 'dashboard',
    items: [
      {
        path: 'dashboard',
        scope: 'dashboard',
        title: 'Dashboard',
        permission: 'reports.dashboard',
        summary: 'Operational snapshot with the most important KPIs for the day.',
        columns: ['Today Collection', 'Monthly Collection', 'Pending Installments', 'Overdue Installments', 'Gold Liability'],
        filters: ['Date Range', 'Branch', 'Scheme']
      },
      {
        path: 'daily-collection',
        scope: 'dashboard',
        title: 'Daily Collection',
        permission: 'reports.daily-collection',
        summary: 'A day-wise collections view for branch staff and management.',
        columns: ['Receipt No', 'Date', 'Customer', 'Amount', 'Mode'],
        filters: ['Date', 'Branch', 'Payment Mode']
      }
    ]
  },
  {
    title: 'Customer Reports',
    description: 'Customer-level account movement and balance tracking.',
    scope: 'operational',
    items: [
      {
        path: 'customer-ledger',
        scope: 'operational',
        title: 'Customer Ledger',
        permission: 'reports.customer-ledger',
        summary: 'Ledger view showing every customer debit, credit, and balance movement.',
        columns: ['Date', 'Voucher No', 'Particular', 'Debit', 'Credit', 'Balance'],
        filters: ['Customer', 'Date Range', 'Branch']
      },
      {
        path: 'customer-statement',
        scope: 'operational',
        title: 'Customer Statement',
        permission: 'reports.customer-statement',
        summary: 'Customer-level statement with payments, dues, and closing balance.',
        columns: ['Date', 'Receipt No', 'Installment No', 'Amount', 'Balance'],
        filters: ['Customer', 'Date Range', 'Status']
      }
    ]
  },
  {
    title: 'Installment Reports',
    description: 'Installment flow, overdue tracking, and partial payment control.',
    scope: 'operational',
    items: [
      {
        path: 'installments/pending',
        scope: 'operational',
        title: 'Pending Installment Report',
        permission: 'reports.installments.pending',
        summary: 'Lists every pending installment with the current due amount.',
        columns: ['Customer', 'Installment No', 'Due Date', 'Pending Amount'],
        filters: ['Customer', 'Scheme', 'Due Date']
      },
      {
        path: 'installments/overdue',
        scope: 'operational',
        title: 'Overdue Installment Report',
        permission: 'reports.installments.overdue',
        summary: 'Highlights overdue dues and the number of days late.',
        columns: ['Customer', 'Days Overdue', 'Amount'],
        filters: ['Customer', 'Branch', 'Days Overdue']
      }
    ]
  },
  {
    title: 'Receipt Reports',
    description: 'Receipt traceability and collection audit trail.',
    scope: 'operational',
    items: [
      {
        path: 'receipts/register',
        scope: 'operational',
        title: 'Receipt Register',
        permission: 'reports.receipts.register',
        summary: 'Register of all receipts issued during a selected period.',
        columns: ['Receipt No', 'Date', 'Customer', 'Amount', 'Mode'],
        filters: ['Date Range', 'Branch', 'Customer']
      }
    ]
  },
  {
    title: 'Branch Reports',
    description: 'Branch-wise collection and operational comparison.',
    scope: 'operational',
    items: [
      {
        path: 'branches/collection',
        scope: 'operational',
        title: 'Branch-wise Collection',
        permission: 'reports.branches.collection',
        summary: 'Collection summary grouped by branch.',
        columns: ['Branch', 'Collection'],
        filters: ['Date Range', 'Branch']
      }
    ]
  },
  {
    title: 'Gold Reports',
    description: 'Gold liability and maturity settlement tracking.',
    scope: 'operational',
    items: [
      {
        path: 'gold/liability',
        scope: 'operational',
        title: 'Gold Liability Report',
        permission: 'reports.gold.liability',
        summary: 'Customer deposits converted into equivalent gold liability.',
        columns: ['Customer', 'Amount', 'Gold Weight'],
        filters: ['Customer', 'Branch', 'Date Range']
      }
    ]
  },
  {
    title: 'Accounting Reports',
    description: 'Core accounting books and financial statements.',
    scope: 'financial',
    items: [
      {
        path: 'accounting/cash-book',
        scope: 'financial',
        title: 'Cash Book',
        permission: 'reports.accounting.cash-book',
        summary: 'Cash receipts, cash payments, and closing balance.',
        columns: ['Date', 'Particular', 'Cash In', 'Cash Out', 'Balance'],
        filters: ['Date Range', 'Branch']
      },
      {
        path: 'accounting/bank-book',
        scope: 'financial',
        title: 'Bank Book',
        permission: 'reports.accounting.bank-book',
        summary: 'Bank receipts, bank payments, and closing balance.',
        columns: ['Date', 'Particular', 'Bank In', 'Bank Out', 'Balance'],
        filters: ['Date Range', 'Bank Account', 'Branch']
      },
      {
        path: 'accounting/trial-balance',
        scope: 'financial',
        title: 'Trial Balance',
        permission: 'reports.accounting.trial-balance',
        summary: 'Ledger-wise debit and credit summary for balancing accounts.',
        columns: ['Ledger', 'Debit', 'Credit'],
        filters: ['Date', 'Branch']
      },
      {
        path: 'accounting/profit-loss',
        scope: 'financial',
        title: 'Profit & Loss',
        permission: 'reports.accounting.profit-loss',
        summary: 'Income, expense, and net profit summary.',
        columns: ['Income', 'Expenses', 'Net Profit'],
        filters: ['Date Range', 'Branch']
      },
      {
        path: 'accounting/balance-sheet',
        scope: 'financial',
        title: 'Balance Sheet',
        permission: 'reports.accounting.balance-sheet',
        summary: 'Assets, liabilities, and equity position summary.',
        columns: ['Assets', 'Liabilities', 'Equity'],
        filters: ['Date', 'Branch']
      }
    ]
  }
]

export const reportItems = reportSections.flatMap(section => section.items)

export const reportItemByPath = new Map<ReportPath, ReportItem>(reportItems.map(item => [item.path, item]))

export const reportHref = (path: ReportPath) => `/reports/${path}`

export const reportPathToLabel = (path: ReportPath | 'overview') => {
  if (path === 'overview') return 'Reports Overview'

  return reportItemByPath.get(path)?.title || 'Report'
}
