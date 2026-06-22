import { getServerSession } from 'next-auth'
import Alert from '@mui/material/Alert'

// Lib Imports
import { authOptions } from '@/libs/auth'
import { getJewelleryDashboardData } from '@/libs/jewelleryApi'

// Component Imports
import CashierDashboard from '@views/dashboards/cashier/CashierDashboard'

const CashierDashboardPage = async () => {
  const session = (await getServerSession(authOptions)) as
    | {
        accessToken?: string
        backendUser?: {
          name?: string
          email?: string | null
          mobile?: string | null
        }
      }
    | null

  let data: Awaited<ReturnType<typeof getJewelleryDashboardData>> | null = null
  let fetchError: string | null = null

  if (session?.accessToken) {
    try {
      data = await getJewelleryDashboardData(session.accessToken)
    } catch (error) {
      fetchError = error instanceof Error ? error.message : 'Unable to load dashboard data.'
    }
  } else {
    fetchError = 'No authenticated backend token found in session.'
  }

  if (fetchError || !data) {
    return (
      <Alert severity='warning'>
        {`${fetchError || 'Unable to load dashboard data.'} Sign in with a valid account to view live data.`}
      </Alert>
    )
  }

  return <CashierDashboard report={data.report} initialPayments={data.payments} />
}

export default CashierDashboardPage
