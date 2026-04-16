'use client'

import { useCallback, useEffect, useState } from 'react'
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
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

type CreateCustomerResponse = {
  data: {
    id: number
    user_id?: number | null
  }
}

type BranchOption = {
  id: number
  name: string
  code: string
}

type BranchesResponse = {
  data: BranchOption[]
}

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const AddCustomerPage = () => {
  const router = useRouter()
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [portalPassword, setPortalPassword] = useState('')
  const [branchId, setBranchId] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'blocked'>('active')
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

  useEffect(() => {
    if (!accessToken) return

    const loadBranches = async () => {
      setLoadingBranches(true)

      try {
        const response = await request<BranchesResponse>('/branches?per_page=200&sort_by=name&sort_direction=asc')
        setBranches(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load branches.')
      } finally {
        setLoadingBranches(false)
      }
    }

    void loadBranches()
  }, [accessToken, request])

  const handleSubmit = async () => {
    if (!mobile.trim()) {
      setError('Mobile number is required.')
      return
    }

    if (!portalPassword.trim()) {
      setError('Password is required to create customer portal login.')
      return
    }

    if (!branchId) {
      setError('Please choose a branch.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await request<CreateCustomerResponse>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim() || null,
          mobile: mobile.trim(),
          email: email.trim() || null,
          status,
          portal_enabled: true,
          portal_password: portalPassword.trim(),
          branch_id: Number(branchId)
        })
      })

      setSuccess('Customer, login user, and branch assignment created successfully.')
      router.push('/customers')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer.')
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
            background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #0891b2 100%)'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 6 } }}>
            <Stack spacing={2}>
              <Chip
                label='Customer Onboarding'
                sx={{
                  alignSelf: 'flex-start',
                  bgcolor: 'rgba(255,255,255,0.12)',
                  color: 'common.white'
                }}
              />
              <Typography variant='h4' sx={{ color: 'common.white' }}>
                Add customer, create login user, and assign branch.
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 760 }}>
                Save the customer profile, generate the linked portal user with password, and connect the record to the selected branch in one step.
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
              {success ? <Alert severity='success'>{success}</Alert> : null}

              <Typography variant='h5'>Customer Details</Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='Customer Name' placeholder='Customer full name' value={name} onChange={event => setName(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='Mobile Number' placeholder='9876543210' value={mobile} onChange={event => setMobile(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth type='email' label='Email Address' placeholder='customer@example.com' value={email} onChange={event => setEmail(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth type='password' label='Customer Password' placeholder='Enter portal password' value={portalPassword} onChange={event => setPortalPassword(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label='Choose Branch'
                    value={branchId}
                    onChange={event => setBranchId(event.target.value)}
                    disabled={loadingBranches}
                  >
                    {branches.map(branch => (
                      <MenuItem key={branch.id} value={branch.id}>
                        {`${branch.name} • ${branch.code}`}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField select fullWidth label='Customer Status' value={status} onChange={event => setStatus(event.target.value as typeof status)}>
                    <MenuItem value='active'>Active</MenuItem>
                    <MenuItem value='inactive'>Inactive</MenuItem>
                    <MenuItem value='blocked'>Blocked</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              <Stack direction='row' justifyContent='flex-end' spacing={2}>
                <Button variant='outlined' color='secondary' onClick={() => router.push('/customers')}>
                  Cancel
                </Button>
                <Button variant='contained' onClick={() => void handleSubmit()} disabled={saving || loadingBranches}>
                  {saving ? 'Saving...' : 'Save Customer'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Card>
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant='h5'>What this creates</Typography>
              <Typography variant='body2' color='text.secondary'>
                This action creates the customer record, creates the linked portal user with the password you enter, assigns the customer user to the selected branch, and keeps the account ready for KYC and membership enrollment.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default AddCustomerPage
