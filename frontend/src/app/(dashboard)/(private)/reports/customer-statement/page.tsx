import type { Metadata } from 'next'
import CustomerStatementReportPage from '@views/reports/CustomerStatementReportPage'

export const metadata: Metadata = {
  title: 'Customer Statement Report',
  description: 'Customer-level statement with payments, dues, and closing balance.'
}

export default function CustomerStatementRoute() {
  return <CustomerStatementReportPage />
}
