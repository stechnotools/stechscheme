'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
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

import { getApiBaseUrl } from '@/libs/runtimeConfig'

// ── Types ──────────────────────────────────────────────

type StatementRow = {
  id: number
  date: string
  receipt_no: string
  voucher_no: string | null
  membership_id: number
  membership_no: string
  scheme_name: string
  scheme_code: string
  installment_no: number | null
  installment_due_date: string | null
  amount: number
  gateway: string
  balance: number
}

type CustomerSummary = {
  id: number
  name: string | null
  mobile: string
}

type StatementSummary = {
  customer: CustomerSummary | null
  total_paid: number
  total_due: number
  total_penalty: number
  opening_balance: number
  membership_count: number
}

type MembershipOption = {
  id: number
  membership_no: string
  scheme_name: string
  scheme_code: string
  status: string
  total_paid: number
  installment_value: number
  total_installments: number
  paid_installments: number
}

type MembershipDues = {
  total_installments: number
  paid_installments: number
  total_amount: number
  paid_amount: number
  due_amount: number
  penalty_amount: number
}

type Meta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

type CustomerStatementResponse = {
  data: StatementRow[]
  memberships: MembershipOption[]
  membership_dues: Record<string, MembershipDues>
  meta: Meta
  summary: StatementSummary
  filters: {
    customer_id: string | null
    membership_id: string | null
    date_from: string
    date_to: string
    status: string | null
  }
}

type CustomerOption = {
  id: number
  name: string | null
  mobile: string
}

// ── Constants ──────────────────────────────────────────

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
})

const today = new Date().toISOString().slice(0, 10)
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

const cardSx = {
  borderRadius: 0,
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: '0 18px 45px rgba(15, 23, 42, 0.06)'
} as const

const inputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 0 }
} as const

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' }
]

const gatewayIcons: Record<string, string> = {
  cash: 'ri-wallet-3-line',
  upi: 'ri-qr-code-line',
  card: 'ri-bank-card-line',
  cheque: 'ri-bank-line'
}

const gatewayColors: Record<string, string> = {
  cash: '#0ea5e9',
  upi: '#10b981',
  card: '#f59e0b',
  cheque: '#8b5cf6'
}

// ── Component ──────────────────────────────────────────

const CustomerStatementReportPage = () => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  // ── Filters ──────────────────────────────────────────

  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [selectedMembershipId, setSelectedMembershipId] = useState('')
  const [dateFrom, setDateFrom] = useState(monthStart)
  const [dateTo, setDateTo] = useState(today)
  const [status, setStatus] = useState('')

  // ── Data ─────────────────────────────────────────────

  const [data, setData] = useState<StatementRow[]>([])
  const [memberships, setMemberships] = useState<MembershipOption[]>([])
  const [membershipDues, setMembershipDues] = useState<Record<string, MembershipDues>>({})
  const [summary, setSummary] = useState<StatementSummary | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)

  const searchAbortRef = useRef<AbortController | null>(null)

  // ── API helper ───────────────────────────────────────

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!accessToken) throw new Error('Missing access token')

      const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...(init?.headers || {})
        },
        cache: 'no-store'
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) throw new Error(payload?.message || 'Request failed')

      return payload as T
    },
    [accessToken]
  )

  // ── Customer search (debounced) ──────────────────────

  useEffect(() => {
    if (!accessToken) return

    const query = customerSearch.trim()

    if (query.length < 2) {
      setCustomerOptions([])
      return
    }

    searchAbortRef.current?.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        if (controller.signal.aborted) return

        try {
          const res = await request<{ data: CustomerOption[] }>(
            `/customers?per_page=10&search=${encodeURIComponent(query)}&status=active`,
            { signal: controller.signal }
          )

          if (controller.signal.aborted) return
          setCustomerOptions(res.data || [])
        } catch {
          if (!controller.signal.aborted) setCustomerOptions([])
        }
      })()
    }, 350)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [accessToken, customerSearch, request])

  // ── Fetch report ─────────────────────────────────────

  const fetchReport = useCallback(
    async (currentPage = 1) => {
      if (!accessToken || !selectedCustomer) {
        setError('Select a customer to view the statement.')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          customer_id: String(selectedCustomer.id),
          date_from: dateFrom,
          date_to: dateTo,
          per_page: String(rowsPerPage),
          page: String(currentPage)
        })

        if (selectedMembershipId) params.set('membership_id', selectedMembershipId)
        if (status) params.set('status', status)

        const res = await request<CustomerStatementResponse>(`/reports/customer-statement?${params.toString()}`)

        setData(res.data)
        setMemberships(res.memberships)
        setMembershipDues(res.membership_dues ?? {})
        setSummary(res.summary)
        setMeta(res.meta)
        setPage(res.meta.current_page - 1)
        setRowsPerPage(res.meta.per_page)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customer statement.')
      } finally {
        setLoading(false)
      }
    },
    [accessToken, selectedCustomer, selectedMembershipId, dateFrom, dateTo, status, request, rowsPerPage]
  )

  const handleSearch = () => {
    void fetchReport(1)
  }

  const handleChangePage = (_: unknown, newPage: number) => {
    void fetchReport(newPage + 1)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(event.target.value, 10)
    setRowsPerPage(newSize)
    void fetchReport(1)
  }

  // ── Derived ──────────────────────────────────────────

  const selectedMembershipDues = useMemo(() => {
    if (!selectedMembershipId || !membershipDues[selectedMembershipId]) return null
    return membershipDues[selectedMembershipId]
  }, [selectedMembershipId, membershipDues])

  const progressPercent = useMemo(() => {
    if (!selectedMembershipDues || selectedMembershipDues.total_amount === 0) return 0
    return Math.round((selectedMembershipDues.paid_amount / selectedMembershipDues.total_amount) * 100)
  }, [selectedMembershipDues])

  // ── Render ───────────────────────────────────────────

  return (
    <Stack spacing={4}>
      {/* Header */}
      <Card sx={cardSx}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
              <div>
                <Typography variant='h4'>Customer Statement</Typography>
                <Typography color='text.secondary' sx={{ mt: 0.75 }}>
                  Customer-level statement with payments, dues, and closing balance.
                </Typography>
              </div>
              <Stack direction='row' spacing={1}>
                <Chip label='reports.customer-statement' variant='outlined' size='small' />
                {summary?.customer && (
                  <Chip
                    label={summary.customer.name || summary.customer.mobile}
                    color='primary'
                    variant='tonal'
                    size='small'
                  />
                )}
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={cardSx}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems='flex-end'>
            <Grid size={{ xs: 12, md: 3 }}>
              <Autocomplete
                fullWidth
                options={customerOptions}
                getOptionLabel={option => `${option.name || 'Unnamed'} (${option.mobile})`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={selectedCustomer}
                onChange={(_, value) => {
                  setSelectedCustomer(value)
                  setSelectedMembershipId('')
                  setMemberships([])
                  setData([])
                  setSummary(null)
                  setMeta(null)
                  setCustomerSearch(value ? `${value.name || ''} ${value.mobile}` : '')
                }}
                onInputChange={(_, value) => {
                  setCustomerSearch(value)
                  if (!value) {
                    setSelectedCustomer(null)
                    setMemberships([])
                    setCustomerOptions([])
                  }
                }}
                renderInput={params => (
                  <TextField
                    {...params}
                    label='Customer'
                    placeholder='Search by name or mobile...'
                    sx={inputSx}
                  />
                )}
                noOptionsText='Type at least 2 characters to search'
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                fullWidth
                type='date'
                label='From Date'
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={inputSx}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                fullWidth
                type='date'
                label='To Date'
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={inputSx}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                select
                fullWidth
                label='Status'
                value={status}
                onChange={e => setStatus(e.target.value)}
                sx={inputSx}
              >
                {statusOptions.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Button
                variant='contained'
                fullWidth
                onClick={handleSearch}
                disabled={loading || !selectedCustomer}
                sx={{ height: 56, borderRadius: 0 }}
                startIcon={loading ? <CircularProgress size={18} color='inherit' /> : <i className='ri-search-line' />}
              >
                {loading ? 'Loading...' : 'View Statement'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Membership selector (shown after first fetch) */}
      {memberships.length > 0 && (
        <Card sx={cardSx}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3} alignItems='flex-end'>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  label='Filter by Membership'
                  value={selectedMembershipId}
                  onChange={e => {
                    setSelectedMembershipId(e.target.value)
                    setPage(0)
                  }}
                  sx={inputSx}
                >
                  <MenuItem value=''>All Memberships</MenuItem>
                  {memberships.map(m => (
                    <MenuItem key={m.id} value={String(m.id)}>
                      {m.membership_no} — {m.scheme_name} ({m.scheme_code})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                {selectedMembershipDues && (
                  <Stack spacing={1}>
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='caption' color='text.secondary'>
                        Payment Progress: {selectedMembershipDues.paid_installments}/{selectedMembershipDues.total_installments} installments
                      </Typography>
                      <Typography variant='caption' fontWeight={700}>
                        {progressPercent}%
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        width: '100%',
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'action.hover',
                        overflow: 'hidden'
                      }}
                    >
                      <Box
                        sx={{
                          width: `${progressPercent}%`,
                          height: '100%',
                          borderRadius: 3,
                          background: 'linear-gradient(90deg, #10b981, #059669)',
                          transition: 'width 0.5s ease'
                        }}
                      />
                    </Box>
                    <Stack direction='row' spacing={3}>
                      <Typography variant='caption' color='success.main'>
                        Paid: {currency.format(selectedMembershipDues.paid_amount)}
                      </Typography>
                      <Typography variant='caption' color='warning.main'>
                        Due: {currency.format(selectedMembershipDues.due_amount)}
                      </Typography>
                      {selectedMembershipDues.penalty_amount > 0 && (
                        <Typography variant='caption' color='error.main'>
                          Penalty: {currency.format(selectedMembershipDues.penalty_amount)}
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3}>            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card sx={{ ...cardSx, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant='body2' color='text.secondary' fontWeight={600}>
                  Opening Balance
                </Typography>
                <Typography variant='h5' fontWeight={800} sx={{ mt: 1, color: summary.opening_balance > 0 ? 'warning.main' : 'text.secondary' }}>
                  {currency.format(summary.opening_balance)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card sx={{ ...cardSx, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant='body2' color='text.secondary' fontWeight={600}>
                  Total Paid
                </Typography>
                <Typography variant='h5' fontWeight={800} sx={{ mt: 1, color: 'success.main' }}>
                  {currency.format(summary.total_paid)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card sx={{ ...cardSx, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant='body2' color='text.secondary' fontWeight={600}>
                  Total Due
                </Typography>
                <Typography variant='h5' fontWeight={800} sx={{ mt: 1, color: 'warning.main' }}>
                  {currency.format(summary.total_due)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card sx={{ ...cardSx, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant='body2' color='text.secondary' fontWeight={600}>
                  Total Penalty
                </Typography>
                <Typography variant='h5' fontWeight={800} sx={{ mt: 1, color: 'error.main' }}>
                  {currency.format(summary.total_penalty)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card
              sx={{
                ...cardSx,
                height: '100%',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.7)' }} fontWeight={600}>
                  Memberships
                </Typography>
                <Typography variant='h4' fontWeight={800} sx={{ mt: 1, color: 'common.white' }}>
                  {summary.membership_count}
                </Typography>
                <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  Active scheme{summary.membership_count !== 1 ? 's' : ''}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Error */}
      {error && (
        <Alert severity='error' sx={{ borderRadius: 0 }}>
          {error}
        </Alert>
      )}

      {/* Data Table */}
      <Card sx={cardSx}>
        <CardContent sx={{ p: 0 }}>
          {!selectedCustomer && !loading && data.length === 0 && !error ? (
            <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
              <i className='ri-file-list-3-line' style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }} />
              <Typography variant='h6'>Select a Customer</Typography>
              <Typography variant='body2' color='text.secondary'>
                Search and select a customer above, then click &quot;View Statement&quot; to see their payment history and outstanding dues.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Receipt No</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Scheme</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Membership</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Installment</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Mode</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Amount</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading && data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ py: 8, textAlign: 'center' }}>
                          <CircularProgress size={28} />
                          <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                            Loading statement data...
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                          <i className='ri-inbox-line' style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                          No payments found for the selected filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((row, idx) => (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ color: 'text.secondary' }}>
                            {(page * rowsPerPage) + idx + 1}
                          </TableCell>
                          <TableCell>
                            {new Date(row.date + 'T00:00:00').toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{row.receipt_no}</TableCell>
                          <TableCell>
                            <Typography variant='body2'>{row.scheme_name}</Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {row.scheme_code}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={row.membership_no} size='small' variant='outlined' />
                          </TableCell>
                          <TableCell>
                            {row.installment_no ? (
                              <Stack>
                                <Typography variant='body2' fontWeight={600}>
                                  #{row.installment_no}
                                </Typography>
                                {row.installment_due_date && (
                                  <Typography variant='caption' color='text.secondary'>
                                    Due: {new Date(row.installment_due_date + 'T00:00:00').toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short'
                                    })}
                                  </Typography>
                                )}
                              </Stack>
                            ) : (
                              <Typography color='text.disabled'>-</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Stack direction='row' spacing={1} alignItems='center'>
                              <i
                                className={gatewayIcons[row.gateway] || 'ri-bank-line'}
                                style={{ color: gatewayColors[row.gateway] || '#64748b', fontSize: '1rem' }}
                              />
                              <Typography variant='body2' sx={{ textTransform: 'capitalize' }}>
                                {row.gateway || 'cash'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align='right' sx={{ fontWeight: 700, color: 'success.main' }}>
                            {currency.format(row.amount)}
                          </TableCell>
                          <TableCell align='right'>
                            <Typography
                              fontWeight={700}
                              color={row.balance > 0 ? 'warning.main' : 'success.main'}
                            >
                              {currency.format(row.balance)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {meta && (
                <TablePagination
                  component='div'
                  count={meta.total}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[25, 50, 100, 200]}
                  sx={{ borderTop: '1px solid', borderColor: 'divider' }}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

export default CustomerStatementReportPage
