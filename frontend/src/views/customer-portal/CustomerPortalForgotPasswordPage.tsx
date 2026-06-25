'use client'

import { useState } from 'react'
import classnames from 'classnames'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { OTPInput } from 'input-otp'
import type { SlotProps } from 'input-otp'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { customerPortalPublicRequest } from '@/libs/customerPortal'
import styles from '@/libs/styles/inputOtp.module.css'

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

type Step = 'mobile' | 'otp' | 'password'

const CustomerPortalForgotPasswordPage = () => {
  const router = useRouter()
  const [step, setStep] = useState<Step>('mobile')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const handleRequestOtp = async () => {
    if (!mobile.trim()) {
      setError('Please enter your registered mobile number.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await customerPortalPublicRequest<{ message: string }>('/customer-auth/forgot-password/request', {
        method: 'POST',
        body: JSON.stringify({ mobile: mobile.trim() })
      })

      setInfo(response.message)
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request OTP.')
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyOtp = () => {
    if (otp.length !== 6) {
      setError('Please enter the 6 digit OTP sent to your mobile.')
      return
    }

    setError(null)
    setInfo(null)
    setStep('password')
  }

  const handleResetPassword = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await customerPortalPublicRequest<{ message: string }>('/customer-auth/forgot-password/verify', {
        method: 'POST',
        body: JSON.stringify({
          mobile: mobile.trim(),
          otp,
          password,
          password_confirmation: passwordConfirmation
        })
      })

      setInfo(response.message)
      setTimeout(() => router.replace('/customer/login'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.')
      // OTP may have been consumed/expired on a failed attempt — safest to restart.
      setStep('mobile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        background: 'linear-gradient(135deg, #1f2937 0%, #0f766e 45%, #f59e0b 100%)'
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 460, borderRadius: 4 }}>
        <CardContent sx={{ p: 5 }}>
          <Stack spacing={3}>
            <div>
              <Typography variant='overline' sx={{ color: '#b45309', letterSpacing: '0.14em' }}>
                Customer Panel
              </Typography>
              <Typography variant='h4'>Reset your password</Typography>
              <Typography color='text.secondary' sx={{ mt: 1 }}>
                {step === 'mobile' && 'Enter your registered mobile number to receive an OTP.'}
                {step === 'otp' && 'Enter the 6 digit OTP sent to your mobile.'}
                {step === 'password' && 'Choose a new password for your account.'}
              </Typography>
            </div>

            {error ? <Alert severity='error'>{error}</Alert> : null}
            {info ? <Alert severity='success'>{info}</Alert> : null}

            {step === 'mobile' && (
              <>
                <TextField fullWidth label='Mobile Number' value={mobile} onChange={event => setMobile(event.target.value)} />
                <Button variant='contained' onClick={() => void handleRequestOtp()} disabled={saving}>
                  {saving ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </>
            )}

            {step === 'otp' && (
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
                <Button variant='contained' onClick={handleVerifyOtp} disabled={saving}>
                  Verify OTP
                </Button>
                <Button variant='text' onClick={() => void handleRequestOtp()} disabled={saving}>
                  Resend OTP
                </Button>
              </>
            )}

            {step === 'password' && (
              <>
                <TextField
                  fullWidth
                  label='New Password'
                  type='password'
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                />
                <TextField
                  fullWidth
                  label='Confirm New Password'
                  type='password'
                  value={passwordConfirmation}
                  onChange={event => setPasswordConfirmation(event.target.value)}
                />
                <Button variant='contained' onClick={() => void handleResetPassword()} disabled={saving}>
                  {saving ? 'Updating...' : 'Update Password'}
                </Button>
              </>
            )}

            <Typography variant='body2' color='text.secondary'>
              <Link href='/customer/login'>Back to login</Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default CustomerPortalForgotPasswordPage
