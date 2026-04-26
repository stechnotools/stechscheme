'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import InputAdornment from '@mui/material/InputAdornment'

const PaymentSkeleton = () => (
  <Grid container spacing={6}>
    <Grid size={{ xs: 12 }}>
      <Skeleton variant='rectangular' height={220} sx={{ borderRadius: 1 }} />
    </Grid>
    <Grid size={{ xs: 12 }}>
      <Skeleton variant='rectangular' height={100} sx={{ borderRadius: 1 }} />
    </Grid>
    <Grid container spacing={6} sx={{ mt: 0 }}>
      {[1, 2, 3, 4].map(i => (
        <Grid key={i} size={{ xs: 12, sm: 6, lg: 3 }}>
          <Skeleton variant='rectangular' height={100} sx={{ borderRadius: 1 }} />
        </Grid>
      ))}
    </Grid>
    <Grid size={{ xs: 12 }}>
      <Card>
        <CardContent>
          <Skeleton variant='rectangular' height={400} />
        </CardContent>
      </Card>
    </Grid>
  </Grid>
)

type MembershipOption = {
  id: number
  customer?: { id?: number; name?: string | null; mobile: string } | null
  scheme?: { name: string; code: string } | null
}

type PaymentItem = {
  id: number
  amount: string | number
  status: string
  payment_date: string
  gateway?: string | null
  transaction_id?: string | null
  membership?: MembershipOption | null
  installment?: {
    id?: number
    installment_no: number
    amount?: string | number | null
    penalty?: string | number | null
  } | null
}

type PaymentsResponse = { data: PaymentItem[] }
type MembershipsResponse = { data: MembershipOption[] }

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const buildQueryString = (baseQuery: string, customerId?: string | null, filters?: any) => {
  const params = new URLSearchParams(baseQuery)
  if (customerId) params.set('customer_id', customerId)
  if (filters?.customer_name) params.set('customer_name', filters.customer_name)
  if (filters?.date_from) params.set('date_from', filters.date_from)
  if (filters?.date_to) params.set('date_to', filters.date_to)
  return params.toString()
}

const getStatusColor = (status: string) => {
  if (status === 'success') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'refunded') return 'info'
  return 'error'
}

const PaymentListPage = ({
  title,
  query,
  showCreateForm: initialShowCreateForm = true,
  showLedger = true
}: {
  title: string
  query: string
  showCreateForm?: boolean
  showLedger?: boolean
}) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const customerId = searchParams.get('customer_id')

  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [memberships, setMemberships] = useState<MembershipOption[]>([])
  
  // Filters
  const [filterName, setFilterName] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // Create Form State
  const [showForm, setShowForm] = useState(initialShowCreateForm)
  const [membershipId, setMembershipId] = useState('')
  const [amount, setAmount] = useState('')
  const [gateway, setGateway] = useState('cash')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<'success' | 'pending' | 'failed' | 'refunded'>('success')
  const [transactionId, setTransactionId] = useState('')
  
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const ledgerQuery = useMemo(() => buildQueryString(query, customerId, {
    customer_name: filterName,
    date_from: filterDateFrom,
    date_to: filterDateTo
  }), [customerId, query, filterName, filterDateFrom, filterDateTo])

  const request = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    if (!accessToken) throw new Error('Missing access token')
    const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {})
      }
    })
    const payload = (await response.json().catch(() => null)) as any
    if (!response.ok) {
      const validationMessage = payload?.errors ? Object.values(payload.errors).flat().join(' ') : null
      throw new Error(validationMessage || payload?.message || 'Request failed')
    }
    return payload as T
  }, [accessToken])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const jobs: Array<Promise<unknown>> = []
      if (showLedger) jobs.push(request<PaymentsResponse>(`/payments?per_page=200&${ledgerQuery}`))
      if (initialShowCreateForm) jobs.push(request<MembershipsResponse>('/memberships?per_page=300&status=active'))

      const results = await Promise.all(jobs)
      let cursor = 0

      if (showLedger) {
        const paymentsResponse = results[cursor] as PaymentsResponse
        setPayments(paymentsResponse.data)
        cursor += 1
      }

      if (initialShowCreateForm) {
        const membershipsResponse = results[cursor] as MembershipsResponse
        setMemberships(customerId ? membershipsResponse.data.filter(item => String(item.customer?.id || '') === customerId) : membershipsResponse.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments.')
    } finally {
      setLoading(false)
    }
  }, [customerId, ledgerQuery, request, initialShowCreateForm, showLedger])

  useEffect(() => {
    if (!accessToken) return
    void load()
  }, [accessToken, load])

  const handleCreate = async () => {
    if (!membershipId || !amount || Number(amount) <= 0) {
      setError('Membership and amount are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const response = await request<{ data: PaymentItem }>('/payments', {
        method: 'POST',
        body: JSON.stringify({
          membership_id: Number(membershipId),
          amount: Number(amount),
          gateway,
          transaction_id: transactionId || null,
          payment_date: paymentDate,
          status
        })
      })
      setAmount('')
      setTransactionId('')
      setMembershipId('')
      setShowForm(false)
      await load()
      if (response.data.id && response.data.status === 'success') {
        router.push(`/payments/receipt/${response.data.id}?autoprint=1`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment.')
    } finally {
      setSaving(false)
    }
  }

  const summary = useMemo(() => {
    const total = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const successful = payments.filter(item => item.status === 'success').length
    const pending = payments.filter(item => item.status === 'pending').length
    return { total, successful, pending, lastPaymentDate: payments[0]?.payment_date }
  }, [payments])

  const handleClearFilters = () => {
    setFilterName('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  if (loading && payments.length === 0) {
    return <PaymentSkeleton />
  }

  return (
    <Grid container spacing={6}>
      {/* Hero Header */}
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 40%, #065f46 100%)',
            color: 'common.white'
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
                  label='Scheme Collections'
                  sx={{
                    alignSelf: 'flex-start',
                    bgcolor: 'rgba(255,255,255,0.12)',
                    color: 'common.white',
                    '& .MuiChip-label': { fontWeight: 700 }
                  }}
                />
                <div>
                  <Typography variant='h3' sx={{ color: 'common.white', mb: 1.5 }}>
                    Deposit Entry Management
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.86)', maxWidth: 680 }}>
                    Monitor and record gold scheme deposits. Use the filters below to search by customer or date range.
                  </Typography>
                </div>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant='contained'
                    onClick={() => setShowForm(!showForm)}
                    sx={{
                      bgcolor: 'common.white',
                      color: '#065f46',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' }
                    }}
                    startIcon={<i className={showForm ? 'ri-close-line' : 'ri-add-line'} />}
                  >
                    {showForm ? 'Cancel Entry' : 'Add New Deposit'}
                  </Button>
                  {customerId && (
                    <Button
                      component={Link}
                      href='/payments/history'
                      variant='outlined'
                      sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.3)' }}
                    >
                      All History
                    </Button>
                  )}
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
                    Entry Summary
                  </Typography>
                  <Typography variant='h4' sx={{ color: 'common.white', mt: 1.5 }}>
                    {payments.length}
                  </Typography>
                  <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.78)', mt: 1 }}>
                    Records matching current filters.
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Filters Card */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Grid container spacing={4} alignItems='center'>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  placeholder='Search by Account Name...'
                  value={filterName}
                  onChange={e => setFilterName(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <i className='ri-search-line' />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  type='date'
                  label='Date From'
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  type='date'
                  label='Date To'
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Button fullWidth variant='outlined' color='secondary' onClick={handleClearFilters}>
                  Clear
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Metrics Row */}
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>Total Collected</Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>{`Rs ${summary.total.toLocaleString('en-IN')}`}</Typography>
            <Typography variant='body2' color='success.main'>Successful deposits</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>Successful Entries</Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>{summary.successful}</Typography>
            <Typography variant='body2' color='text.secondary'>Verified transactions</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>Pending Items</Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>{summary.pending}</Typography>
            <Typography variant='body2' color='warning.main'>Needs verification</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>Last Entry Date</Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>{summary.lastPaymentDate ? new Date(summary.lastPaymentDate).toLocaleDateString('en-IN') : 'N/A'}</Typography>
            <Typography variant='body2' color='text.secondary'>Most recent record</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Main Content */}
      <Grid size={{ xs: 12 }}>
        {error && <Alert severity='error' sx={{ mb: 6 }}>{error}</Alert>}

        <Grid container spacing={6}>
          {showForm && (
            <Grid size={{ xs: 12, lg: showLedger ? 4 : 12 }}>
              <Card sx={{ border: '1px solid', borderColor: 'primary.main', bgcolor: 'action.hover' }}>
                <CardContent>
                  <Stack spacing={4}>
                    <Typography variant='h5' color='primary.main'>Record New Deposit</Typography>
                    <Stack spacing={3}>
                      <TextField select fullWidth label='Select Membership' value={membershipId} onChange={e => setMembershipId(e.target.value)}>
                        {memberships.map(item => (
                          <MenuItem key={item.id} value={item.id}>
                            {(item.customer?.name || item.customer?.mobile || 'Unknown') + ` • ${item.scheme?.code || 'No code'}`}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField fullWidth label='Amount (Rs)' type='number' value={amount} onChange={e => setAmount(e.target.value)} />
                      <TextField fullWidth label='Payment Mode' placeholder='Cash, GPay, Bank Transfer...' value={gateway} onChange={e => setGateway(e.target.value)} />
                      <TextField fullWidth label='Transaction Reference' value={transactionId} onChange={e => setTransactionId(e.target.value)} />
                      <TextField fullWidth type='date' label='Payment Date' value={paymentDate} onChange={e => setPaymentDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                      <TextField select fullWidth label='Entry Status' value={status} onChange={e => setStatus(e.target.value as typeof status)}>
                        <MenuItem value='success'>Success</MenuItem>
                        <MenuItem value='pending'>Pending</MenuItem>
                        <MenuItem value='failed'>Failed</MenuItem>
                        <MenuItem value='refunded'>Refunded</MenuItem>
                      </TextField>
                      <Button variant='contained' onClick={() => void handleCreate()} disabled={saving} size='large' fullWidth>
                        {saving ? 'Processing...' : 'Submit Deposit Entry'}
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}

          {showLedger && (
            <Grid size={{ xs: 12, lg: showForm ? 8 : 12 }}>
              <Card>
                <CardContent sx={{ p: 0 }}>
                  <TableContainer>
                    <Table sx={{ minWidth: 900 }}>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ pl: 4 }}>Date</TableCell>
                          <TableCell>Account Name</TableCell>
                          <TableCell>Scheme / ID</TableCell>
                          <TableCell>Installment</TableCell>
                          <TableCell>Reference</TableCell>
                          <TableCell align='right'>Amount</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align='right' sx={{ pr: 4 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payments.map(item => (
                          <TableRow key={item.id} hover>
                            <TableCell sx={{ pl: 4 }}>{new Date(item.payment_date).toLocaleDateString('en-IN')}</TableCell>
                            <TableCell>
                              <Typography fontWeight={600} variant='body2'>{item.membership?.customer?.name || 'Unknown'}</Typography>
                              <Typography variant='caption' color='text.secondary'>{item.membership?.customer?.mobile}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2' fontWeight={600}>{item.membership?.scheme?.name}</Typography>
                              <Typography variant='caption' color='text.secondary'>{`#${item.membership?.id}`}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2' fontWeight={600}>#{item.installment?.installment_no || '-'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2' sx={{ textTransform: 'capitalize' }}>{item.gateway || 'manual'}</Typography>
                              <Typography variant='caption' color='text.secondary'>{item.transaction_id || 'No ref'}</Typography>
                            </TableCell>
                            <TableCell align='right' sx={{ fontWeight: 700 }}>{`Rs ${Number(item.amount || 0).toLocaleString('en-IN')}`}</TableCell>
                            <TableCell>
                              <Chip size='small' label={item.status} color={getStatusColor(item.status)} variant='tonal' sx={{ fontWeight: 600 }} />
                            </TableCell>
                            <TableCell align='right' sx={{ pr: 4 }}>
                              <Button component={Link} href={`/payments/receipt/${item.id}`} size='small' variant='outlined'>Receipt</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {payments.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} align='center'>
                              <Box sx={{ p: 8 }}>
                                <i className='ri-search-2-line' style={{ fontSize: 48, color: 'var(--mui-palette-text-disabled)' }} />
                                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No matching entries found.</Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Grid>
    </Grid>
  )
}

export default PaymentListPage
