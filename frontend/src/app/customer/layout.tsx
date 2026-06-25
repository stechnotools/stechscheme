import type { Metadata, Viewport } from 'next'
import type { ChildrenType } from '@core/types'
import CustomerPortalShell from '@/components/customer-portal/CustomerPortalShell'

export const metadata: Metadata = {
  title: 'Customer Panel | Jewellery Scheme',
  description: 'Track your jewellery savings scheme membership, installments, payments, and maturity benefits.',
  manifest: '/manifest-customer.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: '/icons/apple-touch-icon-180.png'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Scheme Panel'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f172a'
}

const CustomerLayout = ({ children }: ChildrenType) => {
  return <CustomerPortalShell>{children}</CustomerPortalShell>
}

export default CustomerLayout
