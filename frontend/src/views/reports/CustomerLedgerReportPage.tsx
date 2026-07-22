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

type LedgerRow = {
  id: number
  date: string
  voucher_no: string
  voucher_type: string
  particular: string
  debit: number
  credit: number
  balance: number
  receipt_no: string | null
  branch_name: string
}

type CustomerInfo = {
  id: number
  name: string | null
  mobile: string
}

type LedgerSummary = {
  opening_balance: number
  total_debit: number
  total_credit: number
  closing_balance: number
  customer: CustomerInfo | null
}

type Meta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

type CustomerLedgerResponse = {
  data: LedgerRow[]
  meta: Meta
  summary: LedgerSummary
  filters: {
    customer_id: string | null
    date_from: string
    date_to: string
    branch_id: string | null
  }
}

type CustomerOption = {
  id: number
  name: string | null
  mobile: string
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
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
  '& .MuiOutlinedInput-root': {
    borderRadius: 0
  }
} as const

const CustomerLedgerReportPage = () => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [dateFrom, setDateFrom] = useState(monthStart)
  const [dateTo, setDateTo] = useState(today)
  const [branchId, setBranchId] = useState('')

  const [data, setData] = useState<LedgerRow[]>([])
  const [summary, setSummary] = useState<LedgerSummary | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [branches, setBranches] = useState<Array<{ id: number; name: string; code: string }>>([])

  const searchAbortRef = useRef<AbortController | null>(null)

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

  // Load branches for filter dropdown
  useEffect(() => {
    if (!accessToken) return

    const loadBranches = async () => {
      try {
        const res = await request<{ data: Array<{ id: number; name: string; code: string }> }>(
          '/branches?per_page=200&sort_by=name&sort_direction=asc'
        )
        setBranches(res.data || [])
      } catch {
        // branches are optional
      }
    }

    void loadBranches()
  }, [accessToken, request])

  // Customer search with debounce
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

  const fetchReport = useCallback(
    async (currentPage = 1) => {
      if (!accessToken || !selectedCustomer) {
        setError('Select a customer to view the ledger.')
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

        if (branchId) params.set('branch_id', branchId)

        const res = await request<CustomerLedgerResponse>(`/reports/customer-ledger?${params.toString()}`)

        setData(res.data)
        setSummary(res.summary)
        setMeta(res.meta)
        setPage(res.meta.current_page - 1)
        setRowsPerPage(res.meta.per_page)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customer ledger.')
      } finally {
        setLoading(false)
      }
    },
    [accessToken, selectedCustomer, dateFrom, dateTo, branchId, request, rowsPerPage]
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

  const balanceColor = (balance: number) => {
    if (balance > 0) return 'success.main'
    if (balance < 0) return 'error.main'
    return 'text.secondary'
  }

  return (
    <Stack spacing={4}>
      {/* Header */}
      <Card sx={cardSx}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
              <div>
                <Typography variant='h4'>Customer Ledger</Typography>
                <Typography color='text.secondary' sx={{ mt: 0.75 }}>
                  Ledger view showing every customer debit, credit, and balance movement.
                </Typography>
              </div>
              <Stack direction='row' spacing={1}>
                <Chip label='reports.customer-ledger' variant='outlined' size='small' />
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
                  setCustomerSearch(value ? `${value.name || ''} ${value.mobile}` : '')
                }}
                onInputChange={(_, value) => {
                  setCustomerSearch(value)
                  if (!value) {
                    setSelectedCustomer(null)
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
                label='Branch'
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                sx={inputSx}
              >
                <MenuItem value=''>All Branches</MenuItem>
                {branches.map(b => (
                  <MenuItem key={b.id} value={String(b.id)}>
                    {b.name} ({b.code})
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
                {loading ? 'Loading...' : 'View Ledger'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ ...cardSx, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant='body2' color='text.secondary' fontWeight={600}>
                  Opening Balance
                </Typography>
                <Typography variant='h5' fontWeight={800} sx={{ mt: 1, color: balanceColor(summary.opening_balance) }}>
                  {currencyFormatter.format(summary.opening_balance)}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  As of {new Date(dateFrom + 'T00:00:00').toLocaleDateString('en-IN')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card sx={{ ...cardSx, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant='body2' color='text.secondary' fontWeight={600}>
                  Total Debit
                </Typography>
                <Typography variant='h5' fontWeight={800} sx={{ mt: 1, color: 'error.main' }}>
                  {currencyFormatter.format(summary.total_debit)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card sx={{ ...cardSx, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant='body2' color='text.secondary' fontWeight={600}>
                  Total Credit
                </Typography>
                <Typography variant='h5' fontWeight={800} sx={{ mt: 1, color: 'success.main' }}>
                  {currencyFormatter.format(summary.total_credit)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card sx={{ ...cardSx, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant='body2' color='text.secondary' fontWeight={600}>
                  Net Movement
                </Typography>
                <Typography
                  variant='h5'
                  fontWeight={800}
                  sx={{ mt: 1, color: summary.total_credit >= summary.total_debit ? 'success.main' : 'error.main' }}
                >
                  {currencyFormatter.format(Math.abs(summary.total_credit - summary.total_debit))}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {summary.total_credit >= summary.total_debit ? 'Net Credit' : 'Net Debit'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                ...cardSx,
                height: '100%',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.7)' }} fontWeight={600}>
                  Closing Balance
                </Typography>
                <Typography variant='h4' fontWeight={800} sx={{ mt: 1, color: 'common.white' }}>
                  {currencyFormatter.format(summary.closing_balance)}
                </Typography>
                <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  As of {new Date(dateTo + 'T00:00:00').toLocaleDateString('en-IN')}
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
              <i className='ri-user-search-line' style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }} />
              <Typography variant='h6'>Select a Customer</Typography>
              <Typography variant='body2' color='text.secondary'>
                Search and select a customer above, then click &quot;View Ledger&quot; to see their account movements.
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
                      <TableCell sx={{ fontWeight: 700 }}>Voucher No</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Particular</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Debit</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Credit</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading && data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ py: 8, textAlign: 'center' }}>
                          <CircularProgress size={28} />
                          <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                            Loading ledger data...
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                          <i className='ri-inbox-line' style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                          No ledger entries found for the selected filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((row, idx) => {
                        const isOpeningRow = row.id === 0

                        return (
                          <TableRow
                            key={row.id}
                            hover
                            sx={isOpeningRow ? { bgcolor: 'action.hover', fontStyle: 'italic' } : {}}
                          >
                            <TableCell sx={{ color: 'text.secondary' }}>
                              {isOpeningRow ? '' : (page * rowsPerPage) + idx + 1}
                            </TableCell>
                            <TableCell>
                              {row.date
                                ? new Date(row.date + 'T00:00:00').toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Chip label={row.voucher_no} size='small' variant='outlined' sx={{ fontWeight: 600 }} />
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2' sx={{ maxWidth: 300 }}>
                                {row.particular}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>{row.branch_name || '-'}</Typography>
                            </TableCell>
                            <TableCell align='right'>
                              {row.debit > 0 ? (
                                <Typography fontWeight={600} color='error.main'>
                                  {currencyFormatter.format(row.debit)}
                                </Typography>
                              ) : (
                                <Typography color='text.disabled'>-</Typography>
                              )}
                            </TableCell>
                            <TableCell align='right'>
                              {row.credit > 0 ? (
                                <Typography fontWeight={600} color='success.main'>
                                  {currencyFormatter.format(row.credit)}
                                </Typography>
                              ) : (
                                <Typography color='text.disabled'>-</Typography>
                              )}
                            </TableCell>
                            <TableCell align='right'>
                              <Typography fontWeight={700} color={balanceColor(row.balance)}>
                                {currencyFormatter.format(row.balance)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )
                      })
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

export default CustomerLedgerReportPage
