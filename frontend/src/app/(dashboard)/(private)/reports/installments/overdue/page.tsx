import type { Metadata } from 'next'
import OverdueInstallmentReportPage from '@views/reports/OverdueInstallmentReportPage'

export const metadata: Metadata = {
  title: 'Overdue Installment Report',
  description: 'Highlights overdue dues and the number of days late.'
}

export default function OverdueInstallmentRoute() {
  return <OverdueInstallmentReportPage />
}
