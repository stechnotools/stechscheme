'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  getCustomerLocationLabel,
  getCustomerName,
  getCustomerStatusColor,
  getKycStatusColor,
  resolveBackendApiUrl,
  type Customer,
  type CustomersResponse
} from './customerData'

const CustomerListPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'blocked'>('all')
  const [kycFilter, setKycFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

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

      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(payload?.message || 'Request failed')
      }

      return payload as T
    },
    [accessToken]
  )

  const loadCustomers = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      const response = await request<CustomersResponse>('/customers?per_page=200&sort_by=created_at&sort_direction=desc')
      setCustomers(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, request])

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`Delete ${getCustomerName(customer)}?`)) return

    setError(null)
    setSuccess(null)

    try {
      await request(`/customers/${customer.id}`, {
        method: 'DELETE'
      })
      setSuccess(`${getCustomerName(customer)} deleted successfully.`)
      await loadCustomers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer.')
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')
      return
    }

    if (status === 'authenticated') {
      void loadCustomers()
    }
  }, [status, accessToken, loadCustomers])

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return customers.filter(customer => {
      const name = getCustomerName(customer)
      const location = getCustomerLocationLabel(customer)
      const matchesSearch =
        !query ||
        name.toLowerCase().includes(query) ||
        customer.mobile.toLowerCase().includes(query) ||
        (customer.email || '').toLowerCase().includes(query) ||
        location.toLowerCase().includes(query)

      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter
      const customerKycStatus = customer.kyc?.status || 'pending'
      const matchesKyc = kycFilter === 'all' || customerKycStatus === kycFilter

      return matchesSearch && matchesStatus && matchesKyc
    })
  }, [customers, kycFilter, search, statusFilter])

  const totals = useMemo(() => {
    const active = filteredCustomers.filter(customer => customer.status === 'active').length
    const approvedKyc = filteredCustomers.filter(customer => customer.kyc?.status === 'approved').length
    const pendingKyc = filteredCustomers.filter(customer => !customer.kyc || customer.kyc.status === 'pending').length

    return {
      total: filteredCustomers.length,
      active,
      approvedKyc,
      pendingKyc
    }
  }, [filteredCustomers])

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            overflow: 'hidden',
            position: 'relative',
            color: 'common.white',
            background:
              'radial-gradient(circle at top left, rgba(16,185,129,0.22), transparent 24%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 40%, #0f766e 100%)'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 7 } }}>
            <Box
              sx={{
                position: 'absolute',
                insetInlineEnd: -40,
                insetBlockStart: -60,
                width: 220,
                height: 220,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)'
              }}
            />
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={3}
              justifyContent='space-between'
              alignItems={{ xs: 'flex-start', lg: 'center' }}
              sx={{ position: 'relative', zIndex: 1 }}
            >
              <Stack spacing={2} sx={{ maxWidth: 760 }}>
                <Chip
                  label='Customer Network'
                  sx={{
                    alignSelf: 'flex-start',
                    bgcolor: 'rgba(255,255,255,0.12)',
                    color: 'common.white',
                    '& .MuiChip-label': { fontWeight: 700 }
                  }}
                />
                <div>
                  <Typography variant='h3' sx={{ color: 'common.white', mb: 1.5 }}>
                    Track customer onboarding, KYC health, and relationship coverage.
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 680 }}>
                    Bring the sales desk, KYC team, and membership operations into one clean customer command center.
                  </Typography>
                </div>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    component={Link}
                    href='/customers/add'
                    variant='contained'
                    startIcon={<i className='ri-user-add-line' />}
                    sx={{
                      bgcolor: 'common.white',
                      color: '#0f4c81',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' }
                    }}
                  >
                    Add Customer
                  </Button>
                  <Button
                    variant='outlined'
                    onClick={() => void loadCustomers()}
                    sx={{
                      color: 'common.white',
                      borderColor: 'rgba(255,255,255,0.28)',
                      '&:hover': {
                        borderColor: 'rgba(255,255,255,0.5)',
                        bgcolor: 'rgba(255,255,255,0.04)'
                      }
                    }}
                  >
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </Stack>
              </Stack>

              <Card
                sx={{
                  minWidth: { xs: '100%', lg: 320 },
                  bgcolor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  color: 'common.white',
                  border: '1px solid rgba(255,255,255,0.12)'
                }}
              >
                <CardContent>
                  <Typography variant='overline' sx={{ color: 'rgba(255,255,255,0.72)', letterSpacing: 1 }}>
                    Live Customer Count
                  </Typography>
                  <Typography variant='h4' sx={{ color: 'common.white', mt: 1.5 }}>
                    {totals.total}
                  </Typography>
                  <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.78)', mt: 1 }}>
                    {totals.approvedKyc} customers have approved KYC in the current view.
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>
              Visible Customers
            </Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>
              {totals.total}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Based on current filters
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>
              Active Customers
            </Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>
              {totals.active}
            </Typography>
            <Typography variant='body2' color='success.main'>
              Ready for engagement
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>
              Approved KYC
            </Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>
              {totals.approvedKyc}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Fully verified profiles
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>
              Pending KYC
            </Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>
              {totals.pendingKyc}
            </Typography>
            <Typography variant='body2' color={totals.pendingKyc > 0 ? 'warning.main' : 'text.secondary'}>
              Needs follow-up
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              {error ? <Alert severity='error'>{error}</Alert> : null}
              {success ? <Alert severity='success'>{success}</Alert> : null}

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label='Search customers'
                  placeholder='Search by name, mobile, email, or city'
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <i className='ri-search-line' />
                      </InputAdornment>
                    )
                  }}
                />
                <TextField
                  select
                  fullWidth
                  label='Customer status'
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}
                >
                  <MenuItem value='all'>All statuses</MenuItem>
                  <MenuItem value='active'>Active</MenuItem>
                  <MenuItem value='inactive'>Inactive</MenuItem>
                  <MenuItem value='blocked'>Blocked</MenuItem>
                </TextField>
                <TextField
                  select
                  fullWidth
                  label='KYC status'
                  value={kycFilter}
                  onChange={event => setKycFilter(event.target.value as typeof kycFilter)}
                >
                  <MenuItem value='all'>All KYC states</MenuItem>
                  <MenuItem value='pending'>Pending</MenuItem>
                  <MenuItem value='approved'>Approved</MenuItem>
                  <MenuItem value='rejected'>Rejected</MenuItem>
                </TextField>
              </Stack>

              {loading ? (
                <Stack alignItems='center' justifyContent='center' sx={{ py: 10 }}>
                  <CircularProgress />
                </Stack>
              ) : !filteredCustomers.length ? (
                <Alert severity='info'>No customers found for the current filters.</Alert>
              ) : (
                <Grid container spacing={3}>
                  {filteredCustomers.map(customer => {
                    const location = getCustomerLocationLabel(customer)
                    const joinedOn = customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-IN') : 'Unknown'
                    const kycStatus = customer.kyc?.status || 'pending'

                    return (
                      <Grid key={customer.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                        <Card
                          variant='outlined'
                          sx={{
                            height: '100%',
                            borderColor: 'divider',
                            background: 'linear-gradient(135deg, rgba(15,23,42,0.015) 0%, rgba(13,148,136,0.04) 100%)'
                          }}
                        >
                          <CardContent>
                            <Stack spacing={2.5}>
                              <Stack direction='row' justifyContent='space-between' spacing={2} alignItems='flex-start'>
                                <Stack direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0 }}>
                                  <Avatar
                                    src={customer.kyc?.photo || undefined}
                                    alt={getCustomerName(customer)}
                                    sx={{ width: 56, height: 56 }}
                                  >
                                    {getCustomerName(customer).charAt(0).toUpperCase()}
                                  </Avatar>
                                  <div>
                                    <Typography variant='h5'>{getCustomerName(customer)}</Typography>
                                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                                      Joined on {joinedOn}
                                    </Typography>
                                  </div>
                                </Stack>
                                <Chip
                                  label={customer.status || 'blocked'}
                                  color={getCustomerStatusColor(customer.status)}
                                  size='small'
                                  variant='tonal'
                                />
                              </Stack>

                              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                                <Chip
                                  label={kycStatus === 'pending' ? 'KYC Pending' : `KYC ${kycStatus}`}
                                  color={getKycStatusColor(kycStatus)}
                                  size='small'
                                  variant='tonal'
                                />
                                <Chip label={location} size='small' variant='outlined' />
                              </Stack>

                              <Grid container spacing={2.5}>
                                <Grid size={{ xs: 12 }}>
                                  <Typography variant='body2' color='text.secondary'>
                                    Mobile
                                  </Typography>
                                  <Typography fontWeight={700}>{customer.mobile}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                  <Typography variant='body2' color='text.secondary'>
                                    Email
                                  </Typography>
                                  <Typography fontWeight={700}>{customer.email || 'Not provided'}</Typography>
                                </Grid>
                              </Grid>

                              <Stack direction='row' justifyContent='space-between' alignItems='center' flexWrap='wrap' useFlexGap spacing={1.5}>
                                <Typography variant='body2' color='text.secondary'>
                                  Customer ID #{customer.id}
                                </Typography>
                                <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                                  <Button component={Link} href={`/customers/${customer.id}`} variant='text'>
                                    View
                                  </Button>
                                  <Button component={Link} href={`/customers/${customer.id}/edit`} variant='outlined'>
                                    Edit
                                  </Button>
                                  <Button variant='outlined' color='error' onClick={() => void handleDeleteCustomer(customer)}>
                                    Delete
                                  </Button>
                                </Stack>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    )
                  })}
                </Grid>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default CustomerListPage
