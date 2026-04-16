import type { Metadata } from 'next'
import CustomerPortalLoginPage from '@views/customer-portal/CustomerPortalLoginPage'

export const metadata: Metadata = {
  title: 'Customer Login',
  description: 'Customer portal login'
}

const CustomerLoginRoute = () => {
  return <CustomerPortalLoginPage />
}

export default CustomerLoginRoute
