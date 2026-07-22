'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
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

type OverdueRow = {
  id: number
  installment_no: number
  due_date: string
  days_overdue: number
  amount: number
  paid_amount: number
  pending_amount: number
  penalty: number
  total_due: number
  customer_name: string
  customer_mobile: string
  scheme_name: string
  scheme_code: string
  membership_no: string
  membership_id: number
  customer_id: number
  branch_name: string
}

type Summary = {
  total_overdue: number
  total_pending_amount: number
  total_penalty: number
  total_due: number
}

type Meta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

type OverdueResponse = {
  data: OverdueRow[]
  meta: Meta
  summary: Summary
  filters: {
    customer_id: string | null
    branch_id: string | null
    min_days_overdue: number
  }
}

type CustomerOption = {
  id: number
  name: string | null
  mobile: string
}

type BranchOption = {
  id: number
  name: string
}

// ── Constants ──────────────────────────────────────────

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
})

const cardSx = {
  borderRadius: 0,
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: '0 18px 45px rgba(15, 23, 42, 0.06)'
} as const

const inputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 0 }
} as const

const minDaysOptions = [
  { value: 0, label: 'Any Overdue' },
  { value: 7, label: '7+ Days' },
  { value: 15, label: '15+ Days' },
  { value: 30, label: '30+ Days' },
  { value: 60, label: '60+ Days' },
  { value: 90, label: '90+ Days' }
]

const overdueColor = (days: number): string => {
  if (days >= 90) return '#dc2626'
  if (days >= 60) return '#ea580c'
  if (days >= 30) return '#d97706'
  if (days >= 15) return '#ca8a04'
  return '#65a30d'
}

// ── Component ──────────────────────────────────────────

const OverdueInstallmentReportPage = () => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  // ── Filters ──────────────────────────────────────────

  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [minDaysOverdue, setMinDaysOverdue] = useState(0)

  // ── Data ─────────────────────────────────────────────

  const [data, setData] = useState<OverdueRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
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

  // ── Load branches ────────────────────────────────────

  useEffect(() => {
    if (!accessToken) return

    void (async () => {
      try {
        const res = await request<{ data: BranchOption[] }>('/branches?per_page=200')

        setBranchOptions(res.data || [])
      } catch {
        // Branches list is non-critical
      }
    })()
  }, [accessToken, request])

  // ── Fetch report ─────────────────────────────────────

  const fetchReport = useCallback(
    async (currentPage = 1) => {
      if (!accessToken) {
        setError('You must be logged in to view this report.')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          per_page: String(rowsPerPage),
          page: String(currentPage)
        })

        if (selectedCustomer) params.set('customer_id', String(selectedCustomer.id))
        if (selectedBranchId) params.set('branch_id', selectedBranchId)
        if (minDaysOverdue > 0) params.set('min_days_overdue', String(minDaysOverdue))

        const res = await request<OverdueResponse>(`/reports/installments/overdue?${params.toString()}`)

        setData(res.data)
        setSummary(res.summary)
        setMeta(res.meta)
        setPage(res.meta.current_page - 1)
        setRowsPerPage(res.meta.per_page)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load overdue installments.')
      } finally {
        setLoading(false)
      }
    },
    [accessToken, selectedCustomer, selectedBranchId, minDaysOverdue, request, rowsPerPage]
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

  // ── Render ───────────────────────────────────────────

  return (
    <Stack spacing={4}>
      {/* Header */}
      <Card sx={cardSx}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
              <div>
                <Typography variant='h4'>Overdue Installment Report</Typography>
                <Typography color='text.secondary' sx={{ mt: 0.75 }}>
                  Highlights overdue dues and the number of days late.
                </Typography>
              </div>
              <Stack direction='row' spacing={1}>
                <Chip label='reports.installments.overdue' variant='outlined' size='small' />
                <Chip label='Operational' color='primary' variant='outlined' size='small' />
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
                select
                fullWidth
                label='Branch'
                value={selectedBranchId}
                onChange={e => setSelectedBranchId(e.target.value)}
                sx={inputSx}
              >
                <MenuItem value=''>All Branches</MenuItem>
                {branchOptions.map(b => (
                  <MenuItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                select
                fullWidth
                label='Overdue Period'
                value={minDaysOverdue}
                onChange={e => setMinDaysOverdue(Number(e.target.value))}
                sx={inputSx}
              >
                {minDaysOptions.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                variant='contained'
                fullWidth
                onClick={handleSearch}
                disabled={loading}
                sx={{ height: 56, borderRadius: 0 }}
                startIcon={loading ? <CircularProgress size={18} color='inherit' /> : <i className='ri-search-line' />}
              >
                {loading ? 'Loading...' : 'Search'}
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
                  Overdue Installments
                </Typography>
                <Typography variant='h3' fontWeight={800} sx={{ mt: 1, color: 'error.main' }}>
                  {summary.total_overdue}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ ...cardSx, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant='body2' color='text.secondary' fontWeight={600}>
                  Pending Amount
                </Typography>
                <Typography variant='h5' fontWeight={800} sx={{ mt: 1, color: 'warning.main' }}>
                  {currency.format(summary.total_pending_amount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ ...cardSx, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant='body2' color='text.secondary' fontWeight={600}>
                  Penalty Charges
                </Typography>
                <Typography variant='h5' fontWeight={800} sx={{ mt: 1, color: 'error.main' }}>
                  {currency.format(summary.total_penalty)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                ...cardSx,
                height: '100%',
                background: 'linear-gradient(135deg, #4a0000 0%, #7f1d1d 100%)'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.7)' }} fontWeight={600}>
                  Total Due
                </Typography>
                <Typography variant='h5' fontWeight={800} sx={{ mt: 1, color: 'common.white' }}>
                  {currency.format(summary.total_due)}
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
          {!data.length && !loading && !error ? (
            <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
              <i className='ri-inbox-line' style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }} />
              <Typography variant='h6'>No Overdue Installments</Typography>
              <Typography variant='body2' color='text.secondary'>
                Apply filters above and click &quot;Search&quot; to view overdue installment data.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Scheme</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Membership</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Inst.</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 700 }}>Days Overdue</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Pending</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Penalty</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Total Due</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading && data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} sx={{ py: 8, textAlign: 'center' }}>
                          <CircularProgress size={28} />
                          <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                            Loading overdue installments...
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((row, idx) => (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ color: 'text.secondary' }}>
                            {(page * rowsPerPage) + idx + 1}
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight={600}>{row.customer_name}</Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {row.customer_mobile}
                            </Typography>
                          </TableCell>
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
                            <Typography fontWeight={600}>#{row.installment_no}</Typography>
                          </TableCell>
                          <TableCell>
                            {new Date(row.due_date + 'T00:00:00').toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell align='center'>
                            <Chip
                              label={`${row.days_overdue}d`}
                              size='small'
                              sx={{
                                fontWeight: 700,
                                bgcolor: `${overdueColor(row.days_overdue)}18`,
                                color: overdueColor(row.days_overdue),
                                border: `1px solid ${overdueColor(row.days_overdue)}40`
                              }}
                            />
                          </TableCell>
                          <TableCell align='right' sx={{ fontWeight: 700, color: 'warning.main' }}>
                            {currency.format(row.pending_amount)}
                          </TableCell>
                          <TableCell align='right'>
                            <Typography
                              fontWeight={600}
                              color={row.penalty > 0 ? 'error.main' : 'text.secondary'}
                            >
                              {row.penalty > 0 ? currency.format(row.penalty) : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align='right' sx={{ fontWeight: 800, color: 'error.main' }}>
                            {currency.format(row.total_due)}
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

export default OverdueInstallmentReportPage
