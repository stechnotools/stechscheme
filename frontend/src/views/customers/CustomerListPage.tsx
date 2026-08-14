'use client'

import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
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
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import { SkeletonCard } from '@/components/SkeletonLoader'
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
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalRows, setTotalRows] = useState(0)
  const [summary, setSummary] = useState<{
    total_customers: number
    active_customers: number
    approved_kyc_customers: number
    pending_kyc_customers: number
  } | null>(null)

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
      const params = new URLSearchParams({
        page: String(page + 1),
        per_page: String(rowsPerPage)
      })

      const query = search.trim()
      if (query) params.set('search', query)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (kycFilter !== 'all') params.set('kyc_status', kycFilter)

      const response = await request<CustomersResponse>(`/customers?${params.toString()}`)
      setCustomers(response.data || [])
      setTotalRows(response.total || response.data?.length || 0)
      setSummary(response.summary || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, request, page, rowsPerPage, search, statusFilter, kycFilter])

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`Delete ${getCustomerName(customer)}?`)) return

    setError(null)
    setSuccess(null)

    try {
      const shouldGoToPreviousPage = customers.length === 1 && page > 0

      await request(`/customers/${customer.id}`, {
        method: 'DELETE'
      })
      setSuccess(`${getCustomerName(customer)} deleted successfully.`)

      if (shouldGoToPreviousPage) {
        setPage(current => Math.max(0, current - 1))
      } else {
        await loadCustomers()
      }
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

  const totals = summary || {
    total_customers: totalRows,
    active_customers: customers.filter(customer => customer.status === 'active').length,
    approved_kyc_customers: customers.filter(customer => customer.kyc?.status === 'approved').length,
    pending_kyc_customers: customers.filter(customer => !customer.kyc || customer.kyc.status === 'pending').length
  }

  const handleSearchChange = (value: string) => {
    setPage(0)
    setSearch(value)
  }

  const handleStatusChange = (value: typeof statusFilter) => {
    setPage(0)
    setStatusFilter(value)
  }

  const handleKycChange = (value: typeof kycFilter) => {
    setPage(0)
    setKycFilter(value)
  }

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

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
                    component={Link}
                    href='/customers/merge'
                    variant='outlined'
                    startIcon={<i className='ri-group-line' />}
                    sx={{
                      color: 'common.white',
                      borderColor: 'rgba(255,255,255,0.28)',
                      '&:hover': {
                        borderColor: 'rgba(255,255,255,0.5)',
                        bgcolor: 'rgba(255,255,255,0.04)'
                      }
                    }}
                  >
                    Merge Duplicate
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
                    Matching Customers
                  </Typography>
                  <Typography variant='h4' sx={{ color: 'common.white', mt: 1.5 }}>
                    {totals.total_customers}
                  </Typography>
                  <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.78)', mt: 1 }}>
                    {totals.approved_kyc_customers} customers have approved KYC in the current result set.
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
              Matching Customers
            </Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>
              {totals.total_customers}
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
              {totals.active_customers}
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
              {totals.approved_kyc_customers}
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
              {totals.pending_kyc_customers}
            </Typography>
            <Typography variant='body2' color={totals.pending_kyc_customers > 0 ? 'warning.main' : 'text.secondary'}>
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
                  onChange={event => handleSearchChange(event.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        {loading ? <CircularProgress size={18} /> : <i className='ri-search-line' />}
                      </InputAdornment>
                    )
                  }}
                />
                <TextField
                  select
                  fullWidth
                  label='Customer status'
                  value={statusFilter}
                  onChange={event => handleStatusChange(event.target.value as typeof statusFilter)}
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
                  onChange={event => handleKycChange(event.target.value as typeof kycFilter)}
                >
                  <MenuItem value='all'>All KYC states</MenuItem>
                  <MenuItem value='pending'>Pending</MenuItem>
                  <MenuItem value='approved'>Approved</MenuItem>
                  <MenuItem value='rejected'>Rejected</MenuItem>
                </TextField>
              </Stack>

              {loading ? (
                <SkeletonCard count={6} />
              ) : !customers.length ? (
                <Alert severity='info'>No customers found for the current filters.</Alert>
              ) : (
                <>
                  <TableContainer component={Paper} variant='outlined' sx={{ borderRadius: 1 }}>
                    <Table size='small'>
                      <TableHead sx={{ backgroundColor: 'action.hover' }}>
                        <TableRow>
                          <TableCell>Sl No</TableCell>
                          <TableCell>Customer ID</TableCell>
                          <TableCell>Customer</TableCell>
                          <TableCell>Contact Info</TableCell>
                          <TableCell>Status & KYC</TableCell>
                          <TableCell>Location</TableCell>
                          <TableCell align='right'>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {customers.map((customer, index) => {
                          const location = getCustomerLocationLabel(customer)
                          const joinedOn = customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-IN') : 'Unknown'
                          const kycStatus = customer.kyc?.status || 'pending'

                          return (
                            <TableRow key={customer.id} hover>
                              <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                              <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{customer.id}</TableCell>
                              <TableCell>
                                <Stack direction='row' spacing={2} alignItems='center'>
                                  <Avatar
                                    src={customer.kyc?.photo || undefined}
                                    alt={getCustomerName(customer)}
                                    sx={{ width: 40, height: 40 }}
                                  >
                                    {getCustomerName(customer).charAt(0).toUpperCase()}
                                  </Avatar>
                                  <div>
                                    <Typography variant='subtitle2' fontWeight={600}>
                                      {getCustomerName(customer)}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                      Joined {joinedOn}
                                    </Typography>
                                  </div>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography variant='body2' fontWeight={500}>
                                    {customer.mobile}
                                  </Typography>
                                  {customer.email && (
                                    <Typography variant='caption' color='text.secondary'>
                                      {customer.email}
                                    </Typography>
                                  )}
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack direction='row' spacing={1} alignItems='center'>
                                  <Chip
                                    label={customer.status || 'blocked'}
                                    color={getCustomerStatusColor(customer.status)}
                                    size='small'
                                    variant='tonal'
                                    sx={{ height: 24 }}
                                  />
                                  <Chip
                                    label={kycStatus === 'pending' ? 'KYC Pending' : `KYC ${kycStatus}`}
                                    color={getKycStatusColor(kycStatus)}
                                    size='small'
                                    variant='outlined'
                                    sx={{ height: 24 }}
                                  />
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Typography variant='body2'>{location}</Typography>
                              </TableCell>
                              <TableCell align='right'>
                                <Stack direction='row' spacing={0.5} justifyContent='flex-end'>
                                  <Tooltip title='View Details'>
                                    <IconButton component={Link} href={`/customers/${customer.id}`} size='small' color='primary'>
                                      <i className='ri-eye-line' />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title='Edit'>
                                    <IconButton component={Link} href={`/customers/${customer.id}/edit`} size='small' color='info'>
                                      <i className='ri-edit-line' />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title='Delete'>
                                    <IconButton size='small' color='error' onClick={() => void handleDeleteCustomer(customer)}>
                                      <i className='ri-delete-bin-line' />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component='div'
                    count={totalRows}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                  />
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default CustomerListPage
