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

type PendingRow = {
  id: number
  installment_no: number
  due_date: string
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
}

type Summary = {
  total_pending: number
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

type PendingResponse = {
  data: PendingRow[]
  meta: Meta
  summary: Summary
  filters: {
    customer_id: string | null
    scheme_id: string | null
    date_from: string | null
    date_to: string | null
  }
}

type CustomerOption = {
  id: number
  name: string | null
  mobile: string
}

type SchemeOption = {
  id: number
  name: string
  code: string
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

// ── Component ──────────────────────────────────────────

const PendingInstallmentReportPage = () => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  // ── Filters ──────────────────────────────────────────

  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [schemeOptions, setSchemeOptions] = useState<SchemeOption[]>([])
  const [selectedSchemeId, setSelectedSchemeId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // ── Data ─────────────────────────────────────────────

  const [data, setData] = useState<PendingRow[]>([])
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

  // ── Load schemes ─────────────────────────────────────

  useEffect(() => {
    if (!accessToken) return

    void (async () => {
      try {
        const res = await request<{ data: SchemeOption[] }>('/schemes?per_page=200')

        setSchemeOptions(res.data || [])
      } catch {
        // Schemes list is non-critical
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
        if (selectedSchemeId) params.set('scheme_id', selectedSchemeId)
        if (dateFrom) params.set('date_from', dateFrom)
        if (dateTo) params.set('date_to', dateTo)

        const res = await request<PendingResponse>(`/reports/installments/pending?${params.toString()}`)

        setData(res.data)
        setSummary(res.summary)
        setMeta(res.meta)
        setPage(res.meta.current_page - 1)
        setRowsPerPage(res.meta.per_page)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pending installments.')
      } finally {
        setLoading(false)
      }
    },
    [accessToken, selectedCustomer, selectedSchemeId, dateFrom, dateTo, request, rowsPerPage]
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
                <Typography variant='h4'>Pending Installment Report</Typography>
                <Typography color='text.secondary' sx={{ mt: 0.75 }}>
                  Lists every pending installment with the current due amount.
                </Typography>
              </div>
              <Stack direction='row' spacing={1}>
                <Chip label='reports.installments.pending' variant='outlined' size='small' />
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
                label='Scheme'
                value={selectedSchemeId}
                onChange={e => setSelectedSchemeId(e.target.value)}
                sx={inputSx}
              >
                <MenuItem value=''>All Schemes</MenuItem>
                {schemeOptions.map(s => (
                  <MenuItem key={s.id} value={String(s.id)}>
                    {s.name} ({s.code})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                fullWidth
                type='date'
                label='Due From'
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
                label='Due To'
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={inputSx}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
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
                  Pending Installments
                </Typography>
                <Typography variant='h3' fontWeight={800} sx={{ mt: 1, color: 'warning.main' }}>
                  {summary.total_pending}
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
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)'
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
              <Typography variant='h6'>No Pending Installments</Typography>
              <Typography variant='body2' color='text.secondary'>
                Apply filters above and click &quot;Search&quot; to view pending installment data.
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
                      <TableCell sx={{ fontWeight: 700 }}>Inst. No</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Amount</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Paid</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Pending</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Penalty</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Total Due</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading && data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} sx={{ py: 8, textAlign: 'center' }}>
                          <CircularProgress size={28} />
                          <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                            Loading pending installments...
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
                          <TableCell align='right'>{currency.format(row.amount)}</TableCell>
                          <TableCell align='right' sx={{ color: 'text.secondary' }}>
                            {currency.format(row.paid_amount)}
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

export default PendingInstallmentReportPage
