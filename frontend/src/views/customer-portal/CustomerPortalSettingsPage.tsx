'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { customerPortalRequest } from '@/libs/customerPortal'
import {
  disableBiometric,
  disableMpin,
  enrollBiometric,
  isBiometricEnabled,
  isBiometricSupported,
  isMpinEnabled,
  setMpin
} from '@/libs/customerAppLock'
import { getPushSubscriptionStatus, isPushSupported, subscribeToPush, unsubscribeFromPush } from '@/libs/pushNotifications'

const CustomerPortalSettingsPage = () => {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [customerName, setCustomerName] = useState('')
  const [mpinEnabled, setMpinEnabledState] = useState(false)
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [biometricEnabled, setBiometricEnabledState] = useState(false)
  const [lockBusy, setLockBusy] = useState(false)
  const [lockError, setLockError] = useState<string | null>(null)
  const [lockSuccess, setLockSuccess] = useState<string | null>(null)

  const [mpinDialogOpen, setMpinDialogOpen] = useState(false)
  const [mpinStep, setMpinStep] = useState<'enter' | 'confirm'>('enter')
  const [mpinDraft, setMpinDraft] = useState('')
  const [mpinConfirmDraft, setMpinConfirmDraft] = useState('')
  const [mpinDialogError, setMpinDialogError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const status = await getPushSubscriptionStatus()

        setSubscribed(status)
      } catch {
        // Default to "off" if the status check fails — non-fatal.
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  useEffect(() => {
    setMpinEnabledState(isMpinEnabled())
    setBiometricEnabledState(isBiometricEnabled())
    void isBiometricSupported().then(setBiometricSupported)

    customerPortalRequest<{ data: { name?: string | null; mobile: string } }>('/customer-portal/profile')
      .then(response => setCustomerName(response.data.name || response.data.mobile))
      .catch(() => {
        // Only needed as a WebAuthn display label — not worth blocking on.
      })
  }, [])

  const handleToggle = async (checked: boolean) => {
    setToggling(true)
    setError(null)

    try {
      if (checked) {
        await subscribeToPush()
      } else {
        await unsubscribeFromPush()
      }

      setSubscribed(checked)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification settings.')
    } finally {
      setToggling(false)
    }
  }

  const openMpinDialog = () => {
    setMpinStep('enter')
    setMpinDraft('')
    setMpinConfirmDraft('')
    setMpinDialogError(null)
    setMpinDialogOpen(true)
  }

  const handleMpinToggle = (checked: boolean) => {
    setLockError(null)
    setLockSuccess(null)

    if (checked) {
      openMpinDialog()
    } else {
      disableMpin()
      setMpinEnabledState(false)
      setLockSuccess('MPIN lock disabled.')
    }
  }

  const handleMpinDialogContinue = () => {
    setMpinDialogError(null)

    if (mpinStep === 'enter') {
      if (!/^\d{4}$/.test(mpinDraft)) {
        setMpinDialogError('Enter a 4-digit MPIN.')

        return
      }

      setMpinStep('confirm')

      return
    }

    if (mpinConfirmDraft !== mpinDraft) {
      setMpinDialogError('MPINs do not match. Try again.')
      setMpinConfirmDraft('')

      return
    }

    void setMpin(mpinDraft).then(() => {
      setMpinEnabledState(true)
      setMpinDialogOpen(false)
      setLockSuccess('MPIN lock enabled.')
    })
  }

  const handleBiometricToggle = async (checked: boolean) => {
    setLockError(null)
    setLockSuccess(null)

    if (!checked) {
      disableBiometric()
      setBiometricEnabledState(false)
      setLockSuccess('Biometric lock disabled.')

      return
    }

    setLockBusy(true)

    try {
      await enrollBiometric(customerName)
      setBiometricEnabledState(true)
      setLockSuccess('Biometric lock enabled.')
    } catch (err) {
      setLockError(err instanceof Error ? err.message : 'Biometric enrollment failed or was cancelled.')
    } finally {
      setLockBusy(false)
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                App Security
              </Typography>

              {lockError ? <Alert severity='error'>{lockError}</Alert> : null}
              {lockSuccess ? <Alert severity='success'>{lockSuccess}</Alert> : null}

              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <div>
                  <Typography fontWeight={700}>MPIN Lock</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Require a 4-digit MPIN to open the app on this device.
                  </Typography>
                </div>
                <Switch checked={mpinEnabled} disabled={lockBusy} onChange={event => handleMpinToggle(event.target.checked)} />
              </Stack>

              {biometricSupported && (
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <div>
                    <Typography fontWeight={700}>Biometric Lock</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Use your device&apos;s fingerprint or face unlock instead of typing an MPIN.
                    </Typography>
                  </div>
                  {lockBusy ? (
                    <CircularProgress size={24} />
                  ) : (
                    <Switch checked={biometricEnabled} disabled={lockBusy} onChange={event => void handleBiometricToggle(event.target.checked)} />
                  )}
                </Stack>
              )}

              <Typography variant='caption' color='text.secondary'>
                This only locks the app on this device — it doesn&apos;t change your account login.
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Notifications
              </Typography>

              {error ? <Alert severity='error'>{error}</Alert> : null}

              {loading ? (
                <CircularProgress size={24} />
              ) : !isPushSupported() ? (
                <Alert severity='info'>Push notifications aren&apos;t supported on this browser/device.</Alert>
              ) : (
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <div>
                    <Typography fontWeight={700}>Payment & Scheme Alerts</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Get notified about installment reminders, gold rate changes, and maturity alerts.
                    </Typography>
                  </div>
                  <Switch checked={subscribed} disabled={toggling} onChange={event => void handleToggle(event.target.checked)} />
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Language
              </Typography>
              <FormControl fullWidth size='small' disabled>
                <InputLabel>App Language</InputLabel>
                <Select label='App Language' value='en'>
                  <MenuItem value='en'>English</MenuItem>
                </Select>
              </FormControl>
              <Typography variant='caption' color='text.secondary'>
                More languages are coming soon.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Dialog open={mpinDialogOpen} onClose={() => setMpinDialogOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>{mpinStep === 'enter' ? 'Set Your MPIN' : 'Confirm Your MPIN'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {mpinDialogError ? <Alert severity='error'>{mpinDialogError}</Alert> : null}
            <TextField
              autoFocus
              fullWidth
              type='password'
              inputMode='numeric'
              label={mpinStep === 'enter' ? 'Enter 4-digit MPIN' : 'Re-enter MPIN'}
              value={mpinStep === 'enter' ? mpinDraft : mpinConfirmDraft}
              onChange={event => {
                const digits = event.target.value.replace(/\D/g, '').slice(0, 4)

                if (mpinStep === 'enter') setMpinDraft(digits)
                else setMpinConfirmDraft(digits)
              }}
              slotProps={{ htmlInput: { maxLength: 4 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setMpinDialogOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleMpinDialogContinue}>
            {mpinStep === 'enter' ? 'Continue' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CustomerPortalSettingsPage
