// MUI Imports
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css'

// Type Imports
import type { ChildrenType } from '@core/types'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

// Style Imports
import '@/app/globals.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'

export const metadata = {
  title: 'City Jewelers',
  description: 'City Jewelers scheme management platform',
  icons: {
    icon: '/favicon.png'
  }
}

const RootLayout = async (props: ChildrenType) => {
  const { children } = props
  const systemMode = await getSystemMode()

  // Read fresh on every request (API_URL is not NEXT_PUBLIC_-prefixed, so
  // Next.js never inlines it at build time) so client code can pick up a
  // changed backend URL after a container restart, without a rebuild.
  const runtimeConfig = {
    apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  }

  return (
    <html id='__next' lang='en' dir='ltr' suppressHydrationWarning>
      <body className='flex is-full min-bs-full flex-auto flex-col' suppressHydrationWarning>
        <script
          id='__runtime_config__'
          suppressHydrationWarning
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: `window.__RUNTIME_CONFIG__=${JSON.stringify(runtimeConfig)};` }}
        />
        <InitColorSchemeScript attribute='data' defaultMode={systemMode} />
        {children}
      </body>
    </html>
  )
}

export default RootLayout
