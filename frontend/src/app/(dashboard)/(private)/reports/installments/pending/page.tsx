import type { Metadata } from 'next'
import PendingInstallmentReportPage from '@views/reports/PendingInstallmentReportPage'

export const metadata: Metadata = {
  title: 'Pending Installment Report',
  description: 'Lists every pending installment with the current due amount.'
}

export default function PendingInstallmentRoute() {
  return <PendingInstallmentReportPage />
}
