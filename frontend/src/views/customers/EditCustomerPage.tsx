'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { getCustomerName, resolveBackendApiUrl, type CustomerResponse } from './customerData'

type BranchOption = {
  id: number
  name: string
  code: string
}

type BranchesResponse = {
  data: BranchOption[]
}

const EditCustomerPage = ({ customerId }: { customerId: number }) => {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [portalPassword, setPortalPassword] = useState('')
  const [branchId, setBranchId] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'blocked'>('active')
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [customer, setCustomer] = useState<CustomerResponse['data'] | null>(null)
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
    if (sessionStatus === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')
      return
    }

    if (sessionStatus !== 'authenticated') return

    const loadCustomer = async () => {
      setLoading(true)
      setError(null)

      try {
        const [customerResponse, branchResponse] = await Promise.all([
          request<CustomerResponse>(`/customers/${customerId}`),
          request<BranchesResponse>('/branches?per_page=200&sort_by=name&sort_direction=asc')
        ])

        setBranches(branchResponse.data)
        setCustomer(customerResponse.data)
        setName(customerResponse.data.name || '')
        setMobile(customerResponse.data.mobile || '')
        setEmail(customerResponse.data.email || '')
        setStatus((customerResponse.data.status as 'active' | 'inactive' | 'blocked' | null) || 'active')
        setBranchId(customerResponse.data.user?.branches?.[0]?.id ? String(customerResponse.data.user.branches[0].id) : '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customer.')
      } finally {
        setLoading(false)
      }
    }

    void loadCustomer()
  }, [sessionStatus, accessToken, customerId, request])

  const handleSubmit = async () => {
    if (!mobile.trim()) {
      setError('Mobile number is required.')
      return
    }

    if (!branchId) {
      setError('Please choose a branch.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await request(`/customers/${customerId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim() || null,
          mobile: mobile.trim(),
          email: email.trim() || null,
          status,
          branch_id: Number(branchId),
          ...(portalPassword.trim() ? { portal_password: portalPassword.trim() } : {})
        })
      })

      router.push(`/customers/${customerId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Stack alignItems='center' justifyContent='center' sx={{ minHeight: 320 }}>
        <CircularProgress />
      </Stack>
    )
  }

  const activeMemberships = customer?.memberships?.filter(membership => membership.status === 'active') || []
  const totalPaid = customer?.memberships?.reduce((sum, membership) => sum + Number(membership.total_paid || 0), 0) || 0
  const nextDueInstallment = customer?.memberships
    ?.flatMap(membership => membership.installments || [])
    .filter(installment => !installment.paid)
    .sort((left, right) => new Date(left.due_date).getTime() - new Date(right.due_date).getTime())[0]
  const currentBranch = branches.find(branch => String(branch.id) === branchId)?.name || customer?.user?.branches?.[0]?.name || 'Not assigned'
  const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  })

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
                label='Customer Edit'
                sx={{
                  alignSelf: 'flex-start',
                  bgcolor: 'rgba(255,255,255,0.12)',
                  color: 'common.white'
                }}
              />
              <Typography variant='h4' sx={{ color: 'common.white' }}>
                Update {getCustomerName({ id: customerId, name, mobile, email, status })}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 760 }}>
                Keep customer identity, branch assignment, and portal login details current before continuing with KYC and membership operations.
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

              <Typography variant='h5'>Customer Details</Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='Customer Name' value={name} onChange={event => setName(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label='Mobile Number' value={mobile} onChange={event => setMobile(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth type='email' label='Email Address' value={email} onChange={event => setEmail(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    type='password'
                    label='New Customer Password'
                    value={portalPassword}
                    onChange={event => setPortalPassword(event.target.value)}
                    helperText='Optional. Enter only if you want to change the customer portal password.'
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField select fullWidth label='Choose Branch' value={branchId} onChange={event => setBranchId(event.target.value)}>
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
                <Button variant='outlined' color='secondary' onClick={() => router.push(`/customers/${customerId}`)}>
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
        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <div>
                <Typography variant='h5'>Customer Snapshot</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Quick reference while editing this customer.
                </Typography>
              </div>

              <div>
                <Typography variant='body2' color='text.secondary'>
                  Current branch
                </Typography>
                <Typography fontWeight={700}>{currentBranch}</Typography>
              </div>

              <div>
                <Typography variant='body2' color='text.secondary'>
                  Portal login mobile
                </Typography>
                <Typography fontWeight={700}>{customer?.user?.mobile || mobile || '-'}</Typography>
              </div>

              <div>
                <Typography variant='body2' color='text.secondary'>
                  KYC status
                </Typography>
                <Typography fontWeight={700}>{customer?.kyc?.status || 'pending'}</Typography>
              </div>

              <div>
                <Typography variant='body2' color='text.secondary'>
                  Active memberships
                </Typography>
                <Typography fontWeight={700}>{activeMemberships.length}</Typography>
              </div>

              <div>
                <Typography variant='body2' color='text.secondary'>
                  Total paid
                </Typography>
                <Typography fontWeight={700}>{currencyFormatter.format(totalPaid)}</Typography>
              </div>

              <div>
                <Typography variant='body2' color='text.secondary'>
                  Next due date
                </Typography>
                <Typography fontWeight={700}>
                  {nextDueInstallment ? new Date(nextDueInstallment.due_date).toLocaleDateString('en-IN') : 'No pending installment'}
                </Typography>
              </div>

              <Button variant='outlined' onClick={() => router.push(`/customers/${customerId}`)}>
                View Full Profile
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

    </Grid>
  )
}

export default EditCustomerPage
