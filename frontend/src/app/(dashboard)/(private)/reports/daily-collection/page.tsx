import type { Metadata } from 'next'
import DailyCollectionReportPage from '@views/reports/DailyCollectionReportPage'

export const metadata: Metadata = {
  title: 'Daily Collection Report',
  description: 'Day-wise collections view with payment mode breakdown and transaction details.'
}

export default function DailyCollectionRoute() {
  return <DailyCollectionReportPage />
}
