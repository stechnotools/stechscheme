'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'

import AppLockScreen from '@/components/customer-portal/AppLockScreen'
import { clearCustomerPortalToken, getCustomerPortalToken, customerPortalRequest } from '@/libs/customerPortal'
import { isAppLockEnabled, isUnlockedThisSession } from '@/libs/customerAppLock'
import { INSTALL_DISMISSED_KEY, useInstallPrompt } from '@/libs/useInstallPrompt'

const NAV_ITEMS = [
  { label: 'Home', value: 'home', href: '/customer/panel', icon: 'ri-home-5-line', activeIcon: 'ri-home-5-fill' },
  { label: 'Schemes', value: 'schemes', href: '/customer/panel/schemes', icon: 'ri-store-2-line', activeIcon: 'ri-store-2-fill' },
  { label: 'Pay', value: 'pay', href: '/customer/panel/pay', icon: 'ri-bank-card-line', activeIcon: 'ri-bank-card-fill' },
  { label: 'Offers', value: 'offers', href: '/customer/panel/wallet', icon: 'ri-gift-line', activeIcon: 'ri-gift-fill' },
  { label: 'Profile', value: 'profile', href: '/customer/panel/profile', icon: 'ri-user-3-line', activeIcon: 'ri-user-3-fill' }
]

type DrawerItem = { label: string; href: string; icon: string; badge?: 'due' | 'points' }

const DRAWER_SECTIONS: Array<{ label: string; items: DrawerItem[] }> = [
  {
    label: 'Navigation',
    items: [
      { label: 'Dashboard', href: '/customer/panel', icon: 'ri-home-5-line' },
      { label: 'My Schemes', href: '/customer/panel/my-schemes', icon: 'ri-store-2-line' },
      { label: 'Payments', href: '/customer/panel/pay', icon: 'ri-bank-card-line', badge: 'due' },
      { label: 'My Account', href: '/customer/panel/profile', icon: 'ri-user-3-line' }
    ]
  },
  {
    label: 'Quick Access',
    items: [
      { label: 'Wallet & Rewards', href: '/customer/panel/wallet', icon: 'ri-gift-line', badge: 'points' },
      { label: 'Book Appointment', href: '/customer/panel/appointments', icon: 'ri-calendar-event-line' },
      { label: 'Store Locator', href: '/customer/panel/store-locator', icon: 'ri-map-pin-line' },
      { label: 'Catalog', href: '/customer/panel/catalog', icon: 'ri-shopping-bag-3-line' }
    ]
  },
  {
    label: 'Support',
    items: [
      { label: 'My KYC', href: '/customer/panel/kyc', icon: 'ri-shield-check-line' },
      { label: 'Help & Support', href: '/customer/panel/support', icon: 'ri-customer-service-2-line' },
      { label: 'Settings', href: '/customer/panel/settings', icon: 'ri-settings-3-line' }
    ]
  }
]

const greetingOf = () => {
  const hour = new Date().getHours()

  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'

  return 'Good Evening'
}

const initialsOf = (name?: string | null, mobile?: string | null) => {
  if (name && name.trim()) {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('')
  }

  return mobile?.slice(-2) || '?'
}

const CustomerPortalShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname() ?? ''
  const router = useRouter()

  const isLoginRoute =
    pathname === '/customer' ||
    pathname === '/customer/login' ||
    pathname === '/customer/forgot-password' ||
    pathname === '/customer/onboarding' ||
    pathname === '/customer/offline'

  const [drawerOpen, setDrawerOpen] = useState(false)
  const { canInstall, promptInstall } = useInstallPrompt()
  const [bannerDismissed, setBannerDismissed] = useState(true)
  const [profile, setProfile] = useState<{ name: string | null; mobile: string; points: number; hasDue: boolean } | null>(null)
  const [locked, setLocked] = useState(false)

  // Gate the portal behind the MPIN/biometric lock screen on every fresh app
  // open (sessionStorage clears when the tab/PWA closes), but not while the
  // customer is still on login/onboarding routes.
  useEffect(() => {
    if (isLoginRoute) return
    setLocked(isAppLockEnabled() && !isUnlockedThisSession())
  }, [isLoginRoute])

  useEffect(() => {
    setBannerDismissed(typeof window !== 'undefined' && !!window.localStorage.getItem(INSTALL_DISMISSED_KEY))
  }, [])

  // Lightweight header data for the drawer (avatar initials, points, due status) —
  // reuses the existing profile endpoint, which already eager-loads memberships/
  // installments, so no extra request is needed just to compute "any due?".
  useEffect(() => {
    if (isLoginRoute) return

    type ProfileResponse = {
      data: {
        name?: string | null
        mobile: string
        loyalty_points_balance?: string | number | null
        memberships?: Array<{ installments?: Array<{ paid: boolean }> }>
      }
    }

    customerPortalRequest<ProfileResponse>('/customer-portal/profile')
      .then(response => {
        const hasDue = (response.data.memberships || []).some(m => (m.installments || []).some(i => !i.paid))

        setProfile({
          name: response.data.name ?? null,
          mobile: response.data.mobile,
          points: Number(response.data.loyalty_points_balance || 0),
          hasDue
        })
      })
      .catch(() => {
        // Drawer header falls back to a generic state — not worth blocking on this.
      })
  }, [isLoginRoute])

  const dismissInstallPrompt = () => {
    setBannerDismissed(true)
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, '1')
  }

  const handleInstall = async () => {
    await promptInstall()
    setBannerDismissed(true)
  }

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    // Dev-mode chunk URLs aren't content-hashed like production builds, so a
    // cached SW response can keep serving a stale bundle across server restarts —
    // only install the worker in production to avoid that footgun.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => void registration.unregister())
      })

      return
    }

    navigator.serviceWorker.register('/customer-sw.js', { scope: '/customer/' }).catch(() => {
      // Installability is a nice-to-have — never block the portal on SW errors.
    })
  }, [])

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  const activeNav = useMemo(() => {
    if (pathname.startsWith('/customer/panel/profile') || pathname.startsWith('/customer/panel/kyc')) return 'profile'
    if (pathname.startsWith('/customer/panel/schemes')) return 'schemes'
    if (pathname.startsWith('/customer/panel/pay')) return 'pay'
    if (pathname.startsWith('/customer/panel/wallet')) return 'offers'
    if (pathname.startsWith('/customer/panel')) return 'home'

    return false
  }, [pathname])

  const handleLogout = async () => {
    setDrawerOpen(false)

    if (getCustomerPortalToken()) {
      try {
        await customerPortalRequest('/customer-auth/logout', { method: 'POST' })
      } catch {
        // Best-effort logout — still clear the local session below.
      }
    }

    clearCustomerPortalToken()
    router.replace('/customer/login')
  }

  if (isLoginRoute) {
    return <>{children}</>
  }

  if (locked) {
    return <AppLockScreen onUnlock={() => setLocked(false)} />
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#f8fafc'
      }}
    >
      <AppBar
        position='sticky'
        elevation={0}
        sx={{
          background: 'linear-gradient(120deg, #0f172a 0%, #1f2937 60%, #3a2c12 100%)',
          pt: 'env(safe-area-inset-top)'
        }}
      >
        <Toolbar variant='dense' sx={{ minHeight: 56, position: 'relative' }}>
          <IconButton color='inherit' size='small' onClick={() => setDrawerOpen(true)} aria-label='Open menu'>
            <i className='ri-menu-line' style={{ fontSize: '1.3rem' }} />
          </IconButton>

          {activeNav === 'home' ? (
            <Box sx={{ ml: 1.5, minWidth: 0, overflow: 'hidden' }}>
              <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.2 }}>
                {greetingOf()},
              </Typography>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.2 }} noWrap>
                {profile?.name || profile?.mobile || 'Welcome'} <span role='img' aria-label='waving hand'>👋</span>
              </Typography>
            </Box>
          ) : (

            /* Absolutely positioned so it stays truly centered regardless of how
                many icons end up on the left/right side. */
            <Stack
              direction='row'
              alignItems='center'
              spacing={1}
              sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}
            >
              <Box
                component='img'
                src='/images/pwa/logo-emblem.png'
                alt='City Jewelers'
                sx={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0 }}
              />
              <Typography variant='subtitle1' sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                City Jewelers
              </Typography>
            </Stack>
          )}

          <Stack direction='row' spacing={0.5} sx={{ ml: 'auto' }}>
            <IconButton color='inherit' size='small' component={Link} href='/customer/panel/schemes' aria-label='Search schemes'>
              <i className='ri-search-line' style={{ fontSize: '1.2rem' }} />
            </IconButton>
            <IconButton color='inherit' size='small' component={Link} href='/customer/panel/settings' aria-label='Notifications'>
              <i className='ri-notification-3-line' style={{ fontSize: '1.2rem' }} />
            </IconButton>
            <IconButton
              component={Link}
              href='/customer/panel/profile'
              aria-label='My profile'
              sx={{ p: 0.25, ml: 0.25 }}
            >
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  bgcolor: 'rgba(201,168,76,0.18)',
                  border: '1.5px solid #C9A84C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#E2C46A'
                }}
              >
                {initialsOf(profile?.name, profile?.mobile)}
              </Box>
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {canInstall && !bannerDismissed && (
        <Stack
          direction='row'
          spacing={2}
          alignItems='center'
          sx={{ bgcolor: 'common.white', px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Box
            component='img'
            src='/icons/icon-192.png'
            alt='App icon'
            sx={{ width: 40, height: 40, borderRadius: '10px', flexShrink: 0 }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant='body2' sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              Install City Jewelers App
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              Add to your home screen for quick, full-screen access.
            </Typography>
          </Box>
          <Button size='small' variant='contained' onClick={() => void handleInstall()}>
            Install
          </Button>
          <Button size='small' onClick={dismissInstallPrompt}>
            Later
          </Button>
        </Stack>
      )}

      <Drawer anchor='left' open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: 280 } }}>
        <Box sx={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              position: 'relative',
              p: 4,
              pt: 'calc(env(safe-area-inset-top) + 24px)',
              color: 'common.white',
              bgcolor: '#1A130A'
            }}
          >
            <IconButton
              size='small'
              onClick={() => setDrawerOpen(false)}
              aria-label='Close menu'
              sx={{ position: 'absolute', right: 14, top: 'calc(env(safe-area-inset-top) + 14px)', color: 'rgba(255,255,255,0.7)' }}
            >
              <i className='ri-close-line' style={{ fontSize: '1.2rem' }} />
            </IconButton>

            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                bgcolor: 'rgba(201,168,76,0.18)',
                border: '2px solid #C9A84C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
                fontWeight: 700,
                fontSize: '1.05rem',
                color: '#E2C46A'
              }}
            >
              {initialsOf(profile?.name, profile?.mobile)}
            </Box>
            <Typography variant='subtitle1' sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {profile?.name || profile?.mobile || 'Customer'}
            </Typography>
            <Stack direction='row' spacing={0.5} alignItems='center' sx={{ mt: 0.5 }}>
              <i className='ri-star-fill' style={{ fontSize: '0.75rem', color: '#E2C46A' }} />
              <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.78)' }}>
                {profile ? `${profile.points.toLocaleString('en-IN')} pts` : 'Customer Panel'}
              </Typography>
            </Stack>
          </Box>

          <List sx={{ flex: 1, py: 1, overflowY: 'auto' }}>
            {DRAWER_SECTIONS.map((section, sectionIdx) => (
              <Box key={section.label}>
                {sectionIdx > 0 && <Divider sx={{ my: 1 }} />}
                <Typography
                  variant='caption'
                  sx={{ px: 2.5, pt: sectionIdx === 0 ? 0.5 : 1.5, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 700, letterSpacing: '0.6px' }}
                >
                  {section.label.toUpperCase()}
                </Typography>
                {section.items.map(item => {
                  const isActive = item.href === '/customer/panel' ? activeNav === 'home' : pathname.startsWith(item.href)
                  const showDueBadge = item.badge === 'due' && profile?.hasDue
                  const showPointsBadge = item.badge === 'points' && profile && profile.points > 0

                  return (
                    <ListItemButton key={item.href} component={Link} href={item.href} selected={isActive} onClick={() => setDrawerOpen(false)}>
                      <ListItemIcon>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '8px',
                            bgcolor: 'rgba(201,168,76,0.14)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <i className={item.icon} style={{ fontSize: '1.05rem', color: '#9A7828' }} />
                        </Box>
                      </ListItemIcon>
                      <ListItemText primary={item.label} />
                      {showDueBadge && (
                        <Chip label='Due' size='small' sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#FDECEA', color: '#C0392B' }} />
                      )}
                      {showPointsBadge && (
                        <Chip
                          label={`${profile!.points.toLocaleString('en-IN')} pts`}
                          size='small'
                          sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(201,168,76,0.14)', color: '#9A7828' }}
                        />
                      )}
                    </ListItemButton>
                  )
                })}
              </Box>
            ))}

            <Divider sx={{ my: 1 }} />

            <ListItemButton onClick={() => void handleLogout()}>
              <ListItemIcon><i className='ri-logout-box-r-line' style={{ fontSize: '1.3rem', color: '#dc2626' }} /></ListItemIcon>
              <ListItemText primary='Logout' primaryTypographyProps={{ color: 'error' }} />
            </ListItemButton>
          </List>

          <Box sx={{ p: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant='caption' color='text.secondary' align='center' display='block'>
              City Jewelers • v1.0
            </Typography>
          </Box>
        </Box>
      </Drawer>

      <Box component='main' sx={{ flex: 1, pb: 'calc(64px + env(safe-area-inset-bottom))' }}>
        {children}
      </Box>

      <Paper
        elevation={3}
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: theme => theme.zIndex.appBar,
          pb: 'env(safe-area-inset-bottom)',
          background: 'linear-gradient(120deg, #0f172a 0%, #1f2937 60%, #3a2c12 100%)',
          borderTop: '1px solid rgba(201,168,76,0.2)'
        }}
      >
        <BottomNavigation
          showLabels
          value={activeNav}
          sx={{
            height: 64,
            bgcolor: 'transparent',
            '& .MuiBottomNavigationAction-root': {
              color: 'rgba(255,255,255,0.55)',
              '&.Mui-selected': { color: '#E2C46A' }
            }
          }}
        >
          {NAV_ITEMS.map(item => {
            const isActive = activeNav === item.value

            // The center "Pay" action is raised into a floating circular button
            // instead of a flat tab, matching the primary-action treatment on
            // the mobile dashboard mock.
            if (item.value === 'pay') {
              return (
                <BottomNavigationAction
                  key={item.value}
                  label={item.label}
                  value={item.value}
                  component={Link}
                  href={item.href}
                  sx={{
                    '&.Mui-selected, &': { color: '#E2C46A' },
                    pt: 0
                  }}
                  icon={
                    <Box
                      sx={{
                        width: 46,
                        height: 46,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #9A7828 0%, #C9A84C 100%)',
                        boxShadow: '0 6px 14px rgba(0,0,0,0.4)',
                        border: '2px solid #160B33',
                        transform: 'translateY(-14px)'
                      }}
                    >
                      <i className={isActive ? item.activeIcon : item.icon} style={{ fontSize: '1.35rem', color: '#fff' }} />
                    </Box>
                  }
                />
              )
            }

            return (
              <BottomNavigationAction
                key={item.value}
                label={item.label}
                value={item.value}
                component={Link}
                href={item.href}
                icon={<i className={isActive ? item.activeIcon : item.icon} style={{ fontSize: '1.4rem' }} />}
              />
            )
          })}
        </BottomNavigation>
      </Paper>
    </Box>
  )
}

export default CustomerPortalShell
