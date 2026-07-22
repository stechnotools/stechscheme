'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
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

import { getApiBaseUrl } from '@/libs/runtimeConfig'

const resolveBackendApiUrl = getApiBaseUrl
const backendApiUrl = resolveBackendApiUrl()

type DailyCollectionRow = {
  id: number
  receipt_no: string
  payment_date: string
  customer_name: string
  customer_mobile: string
  scheme_name: string
  scheme_code: string
  membership_no: string
  amount: number
  gateway: string
  transaction_id: string
  branch_name: string
}

type ModeTotals = {
  cash: number
  upi: number
  card: number
  cheque: number
  other: number
  grand_total: number
  transaction_count: number
}

type Meta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

type DailyCollectionResponse = {
  data: DailyCollectionRow[]
  mode_totals: ModeTotals
  meta: Meta
  filters: {
    date_from: string
    date_to: string
    gateway: string | null
    branch_id: string | null
  }
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const currencyFull = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
})

const today = new Date().toISOString().slice(0, 10)

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

const gatewayOptions = [
  { value: '', label: 'All Modes' },
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' }
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

const DailyCollectionReportPage = () => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [gateway, setGateway] = useState('')
  const [branchId, setBranchId] = useState('')

  const [data, setData] = useState<DailyCollectionRow[]>([])
  const [modeTotals, setModeTotals] = useState<ModeTotals | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)

  const [branches, setBranches] = useState<Array<{ id: number; name: string; code: string }>>([])

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
        // branches are optional for the report
      }
    }

    void loadBranches()
  }, [accessToken, request])

  const fetchReport = useCallback(
    async (currentPage = 1) => {
      if (!accessToken) return

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          date_from: dateFrom,
          date_to: dateTo,
          per_page: String(rowsPerPage),
          page: String(currentPage)
        })

        if (gateway) params.set('gateway', gateway)
        if (branchId) params.set('branch_id', branchId)

        const res = await request<DailyCollectionResponse>(`/reports/daily-collection?${params.toString()}`)

        setData(res.data)
        setModeTotals(res.mode_totals)
        setMeta(res.meta)
        setPage(res.meta.current_page - 1)
        setRowsPerPage(res.meta.per_page)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load daily collection report.')
      } finally {
        setLoading(false)
      }
    },
    [accessToken, dateFrom, dateTo, gateway, branchId, request, rowsPerPage]
  )

  // Auto-fetch on mount
  useEffect(() => {
    void fetchReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exportParams = useMemo(() => {
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo
    })

    if (gateway) params.set('gateway', gateway)
    if (branchId) params.set('branch_id', branchId)

    return params.toString()
  }, [dateFrom, dateTo, gateway, branchId])

  const handleSearch = () => {
    void fetchReport(1)
  }

  const handleDownload = async (format: 'csv' | 'pdf') => {
    if (!accessToken || exporting) return

    setExporting(format)
    setError(null)

    const url = `${backendApiUrl}/reports/daily-collection/${format}?${exportParams}`

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: format === 'csv' ? 'text/csv' : 'application/pdf'
        }
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)

        throw new Error(payload?.message || `Export failed (${response.status})`)
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')

      a.href = blobUrl
      a.download = `daily-collection-${dateFrom}-to-${dateTo}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export download failed.')
    } finally {
      setExporting(null)
    }
  }

  const handleChangePage = (_: unknown, newPage: number) => {
    void fetchReport(newPage + 1)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(event.target.value, 10)

    setRowsPerPage(newSize)
    void fetchReport(1)
  }

  const totalByMode = useMemo(() => {
    if (!modeTotals) return []

    return Object.entries(gatewayIcons).map(([key, icon]) => {
      const total = modeTotals[key as keyof ModeTotals] ?? 0

      return {
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        total,
        icon,
        color: gatewayColors[key] || '#64748b'
      }
    })
  }, [modeTotals])

  return (
    <Stack spacing={4}>
      {/* Header */}
      <Card sx={cardSx}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
              <div>
                <Typography variant='h4'>Daily Collection Report</Typography>
                <Typography color='text.secondary' sx={{ mt: 0.75 }}>
                  Day-wise collections view with payment mode breakdown and transaction details.
                </Typography>
              </div>
              <Chip label='reports.daily-collection' variant='outlined' size='small' />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={cardSx}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems='flex-end'>
            <Grid size={{ xs: 12, md: 3 }}>
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
            <Grid size={{ xs: 12, md: 3 }}>
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
                label='Payment Mode'
                value={gateway}
                onChange={e => setGateway(e.target.value)}
                sx={inputSx}
              >
                {gatewayOptions.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
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
            <Grid size={{ xs: 12, md: 2 }}>
              <Stack direction='row' spacing={1}>
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
                <Button
                  variant='outlined'
                  onClick={() => void handleDownload('csv')}
                  disabled={loading || !!exporting}
                  sx={{ height: 56, borderRadius: 0, minWidth: 56 }}
                  title={exporting === 'csv' ? 'Downloading...' : 'Download CSV'}
                >
                  {exporting === 'csv' ? (
                    <CircularProgress size={18} color='inherit' />
                  ) : (
                    <i className='ri-file-excel-2-line' style={{ fontSize: '1.2rem' }} />
                  )}
                </Button>
                <Button
                  variant='outlined'
                  onClick={() => void handleDownload('pdf')}
                  disabled={loading || !!exporting}
                  sx={{ height: 56, borderRadius: 0, minWidth: 56 }}
                  title={exporting === 'pdf' ? 'Downloading...' : 'Download PDF'}
                >
                  {exporting === 'pdf' ? (
                    <CircularProgress size={18} color='inherit' />
                  ) : (
                    <i className='ri-file-pdf-2-line' style={{ fontSize: '1.2rem' }} />
                  )}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Mode Summary Cards */}
      {modeTotals && (
        <Grid container spacing={3}>
          {totalByMode.map(mode => (
            <Grid key={mode.key} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ ...cardSx, height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Stack direction='row' justifyContent='space-between' alignItems='center'>
                      <Typography variant='body2' color='text.secondary' fontWeight={600}>
                        {mode.label}
                      </Typography>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: `${mode.color}18`,
                          color: mode.color
                        }}
                      >
                        <i className={mode.icon} style={{ fontSize: '1.15rem' }} />
                      </Box>
                    </Stack>
                    <Typography variant='h5' fontWeight={800} sx={{ color: mode.color }}>
                      {currencyFormatter.format(mode.total)}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* Grand Total Card */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                ...cardSx,
                height: '100%',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.7)' }} fontWeight={600}>
                    Grand Total
                  </Typography>
                  <Typography variant='h4' fontWeight={800} sx={{ color: 'common.white' }}>
                    {currencyFormatter.format(modeTotals.grand_total)}
                  </Typography>
                  <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    {modeTotals.transaction_count} transaction{modeTotals.transaction_count !== 1 ? 's' : ''}
                  </Typography>
                </Stack>
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
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Receipt No.</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Scheme</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Membership</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Mode</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ref / Transaction ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                  <TableCell align='right' sx={{ fontWeight: 700 }}>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ py: 8, textAlign: 'center' }}>
                      <CircularProgress size={28} />
                      <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                        Loading report data...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                      <i className='ri-inbox-line' style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                      No collections found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row, idx) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ color: 'text.secondary' }}>{(page * rowsPerPage) + idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{row.receipt_no}</TableCell>
                      <TableCell>
                        {new Date(row.payment_date + 'T00:00:00').toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' fontWeight={600}>
                          {row.customer_name}
                        </Typography>
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
                      <TableCell>
                        <Typography variant='body2' sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.transaction_id || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{row.branch_name || '-'}</Typography>
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>
                        {currencyFull.format(row.amount)}
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
        </CardContent>
      </Card>
    </Stack>
  )
}

export default DailyCollectionReportPage
