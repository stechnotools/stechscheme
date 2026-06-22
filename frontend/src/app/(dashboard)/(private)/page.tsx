import { getServerSession } from 'next-auth'

// Lib Imports
import { authOptions } from '@/libs/auth'

// Page Imports
import DashboardCRM from './dashboards/crm/page'
import CashierDashboardPage from './dashboards/cashier/page'

const DashboardRouterPage = async () => {
  const session = (await getServerSession(authOptions)) as
    | {
        backendUser?: {
          role?: string | null
          roles?: string[]
        }
      }
    | null

  const role = session?.backendUser?.role || session?.backendUser?.roles?.[0]

  if (role === 'cashier') {
    return <CashierDashboardPage />
  }

  return <DashboardCRM />
}

export default DashboardRouterPage
