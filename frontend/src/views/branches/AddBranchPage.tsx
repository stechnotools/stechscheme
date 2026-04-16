'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { resolveBackendApiUrl } from './data'

type CreateBranchResponse = {
  data: {
    id: number
  }
}

const AddBranchPage = () => {
  const router = useRouter()
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [city, setCity] = useState('')
  const [managerName, setManagerName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [zone, setZone] = useState('south')
  const [defaultVisibility, setDefaultVisibility] = useState('all')
  const [active, setActive] = useState(true)
  const [walkInEnrollments, setWalkInEnrollments] = useState(true)
  const [paymentReminders, setPaymentReminders] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!accessToken) {
        throw new Error('Missing access token')
      }

      const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...(init?.headers || {})
        }
      })

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; errors?: Record<string, string[]> }
        | null

      if (!response.ok) {
        const validationMessage = payload?.errors
          ? Object.values(payload.errors)
              .flat()
              .join(' ')
          : null

        throw new Error(validationMessage || payload?.message || 'Request failed')
      }

      return payload as T
    },
    [accessToken]
  )

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      setError('Branch name and branch code are required.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await request<CreateBranchResponse>('/branches', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          city: city.trim() || null,
          manager_name: managerName.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          status: active ? 'active' : 'inactive'
        })
      })

      router.push(`/branches/${response.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branch.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            color: 'common.white',
            background: 'linear-gradient(135deg, #1f2937 0%, #166534 52%, #0f766e 100%)'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 6 } }}>
            <Stack spacing={2}>
              <Chip
                label='Branch Setup'
                sx={{
                  alignSelf: 'flex-start',
                  bgcolor: 'rgba(255,255,255,0.12)',
                  color: 'common.white'
                }}
              />
              <Typography variant='h4' sx={{ color: 'common.white' }}>
                Add a new branch with operational defaults.
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 760 }}>
                Set identity, city, contact routing, and collection ownership in one place so the new showroom is ready
                for customer onboarding from day one.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              {error ? <Alert severity='error'>{error}</Alert> : null}

              <Alert severity='info'>
                Core branch details below save to the backend now. Zone, default visibility, and onboarding toggles are
                still visual defaults only.
              </Alert>

              <Typography variant='h5'>Branch Details</Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='Branch Name' placeholder='T. Nagar Flagship' value={name} onChange={event => setName(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='Branch Code' placeholder='BR-TN06' value={code} onChange={event => setCode(event.target.value.toUpperCase())} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='City' placeholder='Chennai' value={city} onChange={event => setCity(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='Branch Manager' placeholder='Manager name' value={managerName} onChange={event => setManagerName(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='Phone Number' placeholder='+91 98765 43210' value={phone} onChange={event => setPhone(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='Email Address' placeholder='branch@example.com' value={email} onChange={event => setEmail(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth multiline minRows={3} label='Address' placeholder='Door number, street, landmark' value={address} onChange={event => setAddress(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField select fullWidth label='Collection Zone' value={zone} onChange={event => setZone(event.target.value)}>
                    <MenuItem value='north'>North Cluster</MenuItem>
                    <MenuItem value='south'>South Cluster</MenuItem>
                    <MenuItem value='west'>West Cluster</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField select fullWidth label='Default Scheme Visibility' value={defaultVisibility} onChange={event => setDefaultVisibility(event.target.value)}>
                    <MenuItem value='all'>All schemes</MenuItem>
                    <MenuItem value='selected'>Selected schemes only</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              <Stack direction='row' justifyContent='flex-end' spacing={2}>
                <Button variant='outlined' color='secondary' onClick={() => router.push('/branches')}>
                  Cancel
                </Button>
                <Button variant='contained' onClick={() => void handleSubmit()} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Branch'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Stack spacing={6}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant='h5'>Launch Defaults</Typography>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Typography>Active branch</Typography>
                  <Switch checked={active} onChange={event => setActive(event.target.checked)} />
                </Stack>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Typography>Accept walk-in enrollments</Typography>
                  <Switch checked={walkInEnrollments} onChange={event => setWalkInEnrollments(event.target.checked)} />
                </Stack>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Typography>Enable payment reminders</Typography>
                  <Switch checked={paymentReminders} onChange={event => setPaymentReminders(event.target.checked)} />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant='h5'>What this page is</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Core branch creation is now connected. The extra setup widgets on this side card are still non-persisted
                  placeholders until those fields exist in the backend schema.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  )
}

export default AddBranchPage
