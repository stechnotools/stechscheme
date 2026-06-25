'use client'

import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { getPushSubscriptionStatus, isPushSupported, subscribeToPush, unsubscribeFromPush } from '@/libs/pushNotifications'

const CustomerPortalSettingsPage = () => {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
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
    </Box>
  )
}

export default CustomerPortalSettingsPage
