'use client'

import { useEffect, useState } from 'react'
import classnames from 'classnames'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { OTPInput } from 'input-otp'
import type { SlotProps } from 'input-otp'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import QrCode from '@/components/customer-portal/QrCode'
import {
  customerPortalPublicRequest,
  customerPortalRequest,
  getCustomerPortalToken,
  resolveBackendApiUrl,
  setCustomerPortalToken
} from '@/libs/customerPortal'
import styles from '@/libs/styles/inputOtp.module.css'
import { useInstallPrompt } from '@/libs/useInstallPrompt'

const ONBOARDING_SEEN_KEY = 'customer_onboarding_seen'

const Slot = (props: SlotProps) => (
  <div className={classnames(styles.slot, { [styles.slotActive]: props.isActive })}>
    {props.char !== null && <div>{props.char}</div>}
    {props.hasFakeCaret && (
      <div className={styles.fakeCaret}>
        <div className='w-px h-5 bg-textPrimary' />
      </div>
    )}
  </div>
)

type LoginResponse = { token?: string; message?: string; errors?: Record<string, string[]> }

const CustomerPortalLoginPage = () => {
  const router = useRouter()
  const [mode, setMode] = useState<'password' | 'otp'>('password')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const { canInstall, installed, isIos, promptInstall } = useInstallPrompt()
  const [installAppUrl, setInstallAppUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') setInstallAppUrl(`${window.location.origin}/customer`)
  }, [])

  // Validate any persisted session before showing the login form — an expired/
  // revoked token should never silently strand the user on a stale "logged in" state.
  useEffect(() => {
    const validateSession = async () => {
      const token = getCustomerPortalToken()

      if (!token) {
        if (typeof window !== 'undefined' && !window.localStorage.getItem(ONBOARDING_SEEN_KEY)) {
          router.replace('/customer/onboarding')
          return
        }
        setCheckingSession(false)
        return
      }

      try {
        await customerPortalRequest('/customer-auth/me')
        router.replace('/customer/panel')
      } catch {
        setCheckingSession(false)
      }
    }

    void validateSession()
  }, [router])

  const handlePasswordLogin = async () => {
    if (!mobile.trim() || !password.trim()) {
      setError('Mobile number and password are required.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`${resolveBackendApiUrl()}/customer-auth/login`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobile.trim(), password })
      })

      const payload = (await response.json().catch(() => null)) as LoginResponse | null

      if (!response.ok || !payload?.token) {
        const validationMessage = payload?.errors ? Object.values(payload.errors).flat().join(' ') : null
        throw new Error(validationMessage || payload?.message || 'Customer login failed.')
      }

      setCustomerPortalToken(payload.token)
      router.replace('/customer/panel')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Customer login failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleSendOtp = async () => {
    if (!mobile.trim()) {
      setError('Please enter your registered mobile number.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await customerPortalPublicRequest<{ message: string }>('/customer-auth/login-otp/request', {
        method: 'POST',
        body: JSON.stringify({ mobile: mobile.trim() })
      })

      setInfo(response.message)
      setOtpSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP.')
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6 digit OTP sent to your mobile.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const payload = await customerPortalPublicRequest<LoginResponse>('/customer-auth/login-otp/verify', {
        method: 'POST',
        body: JSON.stringify({ mobile: mobile.trim(), otp })
      })

      if (!payload.token) throw new Error(payload.message || 'OTP login failed.')

      setCustomerPortalToken(payload.token)
      router.replace('/customer/panel')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP login failed.')
      setOtpSent(false)
      setOtp('')
    } finally {
      setSaving(false)
    }
  }

  const switchMode = (next: 'password' | 'otp') => {
    setMode(next)
    setError(null)
    setInfo(null)
    setOtpSent(false)
    setOtp('')
  }

  // Single submit handler so pressing Enter in any field behaves exactly like
  // clicking the (one) primary button currently visible for the active mode.
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (saving) return

    if (mode === 'password') {
      void handlePasswordLogin()
    } else if (!otpSent) {
      void handleSendOtp()
    } else {
      void handleVerifyOtp()
    }
  }

  if (checkingSession) {
    return null
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        // Centering the whole group vertically (as on desktop) would shift the
        // logo header up/down on mobile whenever the sheet's content height
        // changes between Password/OTP modes — anchor to the top instead and
        // let the sheet below grow to fill the rest.
        justifyContent: { xs: 'flex-start', sm: 'center' },
        background: { xs: 'linear-gradient(135deg, #0f172a 0%, #155e75 55%, #f59e0b 100%)', sm: 'linear-gradient(135deg, #1f2937 0%, #0f766e 45%, #f59e0b 100%)' }
      }}
    >
      {/* Mobile-only branded header — replaced by the inline heading inside the card on larger screens */}
      <Stack
        spacing={1.5}
        alignItems='center'
        sx={{
          display: { xs: 'flex', sm: 'none' },
          pt: 'calc(env(safe-area-inset-top) + 36px)',
          pb: 5
        }}
      >
        <Box
          component='img'
          src='/images/pwa/logo-full.png'
          alt='City Jewelers'
          sx={{ width: 118, height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.18))' }}
        />
        <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem' }}>Customer Panel</Typography>
      </Stack>

      <Stack
        spacing={3}
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: 460 },
          mx: { xs: 0, sm: 3 },
          flex: { xs: 1, sm: 'unset' }
        }}
      >
        <Box
          sx={{
            flex: { xs: 1, sm: 'unset' },
            bgcolor: 'common.white',
            borderRadius: { xs: '28px 28px 0 0', sm: 4 },
            p: { xs: 4, sm: 5 },
            pb: { xs: 'calc(env(safe-area-inset-bottom) + 32px)', sm: 5 }
          }}
        >
          <Stack spacing={3}>
            {/* Desktop-only heading — mobile already shows the brand header above */}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant='overline' sx={{ color: '#b45309', letterSpacing: '0.14em' }}>
                Customer Panel
              </Typography>
              <Typography variant='h4'>Login to your account</Typography>
              <Typography color='text.secondary' sx={{ mt: 1 }}>
                View your jewellery scheme membership card, installments, payments, and maturity details.
              </Typography>
            </Box>

            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              <Typography variant='h5' sx={{ fontWeight: 600 }}>Welcome back</Typography>
              <Typography color='text.secondary' sx={{ mt: 0.5, fontSize: '0.85rem' }}>
                Login to view your schemes, installments, and payments.
              </Typography>
            </Box>

            <ToggleButtonGroup
              value={mode}
              exclusive
              fullWidth
              onChange={(_, value: 'password' | 'otp' | null) => value && switchMode(value)}
              sx={{
                bgcolor: 'action.hover',
                borderRadius: 999,
                p: 0.5,
                '& .MuiToggleButtonGroup-grouped': {
                  border: 0,
                  borderRadius: 999,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&.Mui-selected': { bgcolor: 'common.white', boxShadow: 1, color: 'text.primary' }
                }
              }}
            >
              <ToggleButton value='password'>Password</ToggleButton>
              <ToggleButton value='otp'>OTP</ToggleButton>
            </ToggleButtonGroup>

            {error ? <Alert severity='error'>{error}</Alert> : null}
            {info ? <Alert severity='success'>{info}</Alert> : null}

            <Stack component='form' spacing={3} onSubmit={handleSubmit}>
              <TextField fullWidth label='Mobile Number' value={mobile} onChange={event => setMobile(event.target.value)} />

              {mode === 'password' && (
                <>
                  <TextField fullWidth label='Password' type='password' value={password} onChange={event => setPassword(event.target.value)} />
                  <Button type='submit' variant='contained' size='large' disabled={saving} sx={{ borderRadius: 2.5 }}>
                    {saving ? 'Signing in...' : 'Open Customer Panel'}
                  </Button>
                  <Typography variant='body2' color='text.secondary' align='center'>
                    <Link href='/customer/forgot-password'>Forgot password?</Link>
                  </Typography>
                </>
              )}

              {mode === 'otp' && !otpSent && (
                <Button type='submit' variant='contained' size='large' disabled={saving} sx={{ borderRadius: 2.5 }}>
                  {saving ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              )}

              {mode === 'otp' && otpSent && (
                <>
                  <OTPInput
                    onChange={setOtp}
                    value={otp}
                    maxLength={6}
                    containerClassName='flex items-center'
                    render={({ slots }) => (
                      <div className='flex items-center justify-between w-full gap-4'>
                        {slots.slice(0, 6).map((slot, idx) => (
                          <Slot key={idx} {...slot} />
                        ))}
                      </div>
                    )}
                  />
                  <Button type='submit' variant='contained' size='large' disabled={saving} sx={{ borderRadius: 2.5 }}>
                    {saving ? 'Verifying...' : 'Verify & Login'}
                  </Button>
                  <Button type='button' variant='text' onClick={() => void handleSendOtp()} disabled={saving}>
                    Resend OTP
                  </Button>
                </>
              )}
            </Stack>

            <Typography variant='body2' color='text.secondary' align='center'>
              Staff login? <Link href='/login'>Go to dashboard login</Link>
            </Typography>

            {!installed && (
              <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems='center' sx={{ pt: 2 }}>
                  <Stack spacing={1} sx={{ flex: 1 }}>
                    <Typography variant='body2' sx={{ fontWeight: 700 }}>Get the App</Typography>
                    {canInstall ? (
                      <Button
                        variant='outlined'
                        size='small'
                        onClick={() => void promptInstall()}
                        startIcon={<i className='ri-download-2-line' />}
                        sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
                      >
                        Download App
                      </Button>
                    ) : isIos ? (
                      <Typography variant='caption' color='text.secondary'>
                        Tap <strong>Share</strong> in Safari, then <strong>&quot;Add to Home Screen&quot;</strong>.
                      </Typography>
                    ) : (
                      <Typography variant='caption' color='text.secondary'>
                        Scan the QR code with your phone to install.
                      </Typography>
                    )}
                  </Stack>

                  {installAppUrl && (
                    <Stack spacing={0.5} alignItems='center' sx={{ display: { xs: 'none', sm: 'flex' } }}>
                      <QrCode value={installAppUrl} size={84} />
                      <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.65rem' }}>
                        Scan to open
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}

export default CustomerPortalLoginPage
