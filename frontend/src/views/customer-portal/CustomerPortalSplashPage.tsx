'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { customerPortalRequest, getCustomerPortalToken } from '@/libs/customerPortal'

const ONBOARDING_SEEN_KEY = 'customer_onboarding_seen'

// Brand recall needs a minimum on-screen time even if the session check below
// resolves instantly — otherwise the splash just flashes and never registers.
const MIN_DISPLAY_MS = 1100

const CustomerPortalSplashPage = () => {
  const router = useRouter()

  useEffect(() => {
    const shownAt = Date.now()

    const goTo = (path: string) => {
      const elapsed = Date.now() - shownAt
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed)
      setTimeout(() => router.replace(path), remaining)
    }

    const init = async () => {
      const token = getCustomerPortalToken()

      if (!token) {
        const onboardingSeen = typeof window !== 'undefined' && window.localStorage.getItem(ONBOARDING_SEEN_KEY)
        goTo(onboardingSeen ? '/customer/login' : '/customer/onboarding')
        return
      }

      try {
        await customerPortalRequest('/customer-auth/me')
        goTo('/customer/panel')
      } catch {
        goTo('/customer/login')
      }
    }

    void init()
  }, [router])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        background: 'linear-gradient(135deg, #C9A84C 0%, #E2C46A 50%, #9A7828 100%)'
      }}
    >
      <Stack spacing={4} alignItems='center'>
        <Box
          component='img'
          src='/images/pwa/logo-full.png'
          alt='City Jewelers'
          sx={{ width: 168, height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.18))' }}
        />

        <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
          Your Trusted Jewellery Savings Partner
        </Typography>

        <CircularProgress size={28} sx={{ color: 'common.white', mt: 2 }} />
      </Stack>
    </Box>
  )
}

export default CustomerPortalSplashPage
