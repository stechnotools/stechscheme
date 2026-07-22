import type { Metadata } from 'next'
import CustomerLedgerReportPage from '@views/reports/CustomerLedgerReportPage'

export const metadata: Metadata = {
  title: 'Customer Ledger Report',
  description: 'Ledger view showing every customer debit, credit, and balance movement.'
}

export default function CustomerLedgerRoute() {
  return <CustomerLedgerReportPage />
}
