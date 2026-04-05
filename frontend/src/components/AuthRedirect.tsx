'use client'

// Next Imports
import { redirect, usePathname } from 'next/navigation'

// Config Imports
import themeConfig from '@configs/themeConfig'

const AuthRedirect = () => {
  const pathname = usePathname()
  const login = '/login'
  const redirectUrl = `/login?redirectTo=${pathname}`

  return redirect(pathname === login || pathname === themeConfig.homePageUrl ? login : redirectUrl)
}

export default AuthRedirect
