'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
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
import CircularProgress from '@mui/material/CircularProgress'
import { mapApiBranchToBranch, resolveBackendApiUrl, type ApiBranch } from './data'

const EditBranchPage = ({ branchId }: { branchId: number }) => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const [branch, setBranch] = useState<ReturnType<typeof mapApiBranchToBranch> | null>(null)
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
  const [loading, setLoading] = useState(false)
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
        | { data?: ApiBranch; message?: string; errors?: Record<string, string[]> }
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

  useEffect(() => {
    if (status !== 'authenticated' || !accessToken) return

    const loadBranch = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await request<{ data: ApiBranch }>(`/branches/${branchId}`)
        const mapped = mapApiBranchToBranch(response.data)

        setBranch(mapped)
        setName(mapped.name)
        setCode(mapped.code)
        setCity(mapped.city === '-' ? '' : mapped.city)
        setManagerName(mapped.manager === '-' ? '' : mapped.manager)
        setPhone(mapped.phone === '-' ? '' : mapped.phone)
        setEmail(mapped.email === '-' ? '' : mapped.email)
        setAddress(mapped.address === '-' ? '' : mapped.address)
        setZone(mapped.zone)
        setDefaultVisibility(mapped.defaultSchemeVisibility)
        setActive(mapped.active)
        setWalkInEnrollments(mapped.walkInEnrollments)
        setPaymentReminders(mapped.paymentReminders)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load branch.')
      } finally {
        setLoading(false)
      }
    }

    void loadBranch()
  }, [status, accessToken, branchId, request])

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      setError('Branch name and branch code are required.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await request(`/branches/${branchId}`, {
        method: 'PUT',
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

      router.push(`/branches/${branchId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branch.')
    } finally {
      setSaving(false)
    }
  }

  if (!branch) {
    return <Alert severity='error'>{error || 'Branch not found.'}</Alert>
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            color: 'common.white',
            background: 'linear-gradient(135deg, #1f2937 0%, #14532d 50%, #0f766e 100%)'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 6 } }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent='space-between' spacing={3}>
              <div>
                <Chip
                  label='Branch Edit'
                  sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.12)', color: 'common.white' }}
                />
                <Typography variant='h4' sx={{ color: 'common.white', mb: 1 }}>
                  Update {branch.name}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 760 }}>
                  Review operating defaults, contact ownership, and network visibility before saving changes.
                </Typography>
              </div>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button component={Link} href={`/branches/${branch.id}`} variant='outlined' sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.3)' }}>
                  View Branch
                </Button>
                <Button component={Link} href='/branches' variant='outlined' sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.3)' }}>
                  All Branches
                </Button>
              </Stack>
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
                Core branch details below update the backend now. Zone, default visibility, and onboarding toggles are
                still visual defaults only.
              </Alert>

              <Typography variant='h5'>Branch Details</Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='Branch Name' value={name} onChange={event => setName(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='Branch Code' value={code} onChange={event => setCode(event.target.value.toUpperCase())} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='City' value={city} onChange={event => setCity(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='Branch Manager' value={managerName} onChange={event => setManagerName(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='Phone Number' value={phone} onChange={event => setPhone(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='Email Address' value={email} onChange={event => setEmail(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth multiline minRows={3} label='Address' value={address} onChange={event => setAddress(event.target.value)} />
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
                <Button component={Link} href={`/branches/${branch.id}`} variant='outlined' color='secondary'>
                  Cancel
                </Button>
                <Button variant='contained' onClick={() => void handleSubmit()} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
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
                <Typography variant='h5'>Current performance</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {branch.members.toLocaleString('en-IN')} members, {branch.activeSchemes} active schemes, and {branch.dueToday} due follow-ups today.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  )
}

export default EditBranchPage
