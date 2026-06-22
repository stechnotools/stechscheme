'use client'

import { useCallback, useEffect, useState } from 'react'

import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

type UserOption = { id: number; name: string }

type LedgerEntry = {
  id: number
  salesman_id: number
  base_amount: string | number
  commission_amount: string | number
  status: string
  event_type: string
  rule_source: string
  commission_date: string
  salesman?: UserOption
  customer?: { id: number; name?: string | null }
  scheme?: { id: number; name: string }
  commission_type?: { id: number; name: string }
}

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })

const getStatusColor = (status: string) => {
  if (status === 'paid') return 'success'
  if (status === 'approved') return 'info'

  return 'warning'
}

const CommissionLedgerPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [users, setUsers] = useState<UserOption[]>([])
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number[]>([])

  const [salesmanFilter, setSalesmanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
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

      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) throw new Error(payload?.message || 'Request failed')

      return payload as T
    },
    [accessToken]
  )

  const loadUsers = useCallback(async () => {
    try {
      const res = await request<{ data: UserOption[] }>('/users?per_page=200&sort_by=name&sort_direction=asc')
      setUsers(res.data)
    } catch {
      // non-fatal — filter dropdown just stays empty
    }
  }, [request])

  const loadLedger = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ per_page: '100' })
      if (salesmanFilter !== 'all') params.set('salesman_id', salesmanFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const res = await request<{ data: LedgerEntry[] }>(`/commission/ledger?${params.toString()}`)
      setEntries(res.data)
      setSelected([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load commission ledger.')
    } finally {
      setLoading(false)
    }
  }, [request, salesmanFilter, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    if (status === 'authenticated') {
      void loadUsers()
      void loadLedger()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') void loadLedger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesmanFilter, statusFilter, dateFrom, dateTo])

  const toggleSelected = (id: number) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const toggleSelectAll = () => {
    const eligible = entries.filter(e => e.status !== 'paid').map(e => e.id)
    setSelected(prev => (prev.length === eligible.length ? [] : eligible))
  }

  const handleApprove = async (id: number) => {
    try {
      await request(`/commission/ledger/${id}/approve`, { method: 'POST' })
      await loadLedger()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve commission.')
    }
  }

  const handleMarkPaid = async (id: number) => {
    try {
      await request(`/commission/ledger/${id}/mark-paid`, { method: 'POST' })
      await loadLedger()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark commission as paid.')
    }
  }

  const handleBulkMarkPaid = async () => {
    if (selected.length === 0) return

    try {
      await request('/commission/ledger/bulk-mark-paid', { method: 'POST', body: JSON.stringify({ ids: selected }) })
      await loadLedger()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark selected commissions as paid.')
    }
  }

  const eligibleCount = entries.filter(e => e.status !== 'paid').length

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4' sx={{ mb: 1, fontWeight: 600 }}>Commission Ledger</Typography>
        <Typography color='text.secondary'>
          Every commission earned from enrollments and collections. Paid entries are immutable.
        </Typography>
      </Grid>

      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error'>{error}</Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stack direction='row' spacing={3} flexWrap='wrap' useFlexGap alignItems='center'>
              <TextField select size='small' label='Salesman' sx={{ minWidth: 180 }} value={salesmanFilter} onChange={e => setSalesmanFilter(e.target.value)}>
                <MenuItem value='all'>All Salesmen</MenuItem>
                {users.map(u => (
                  <MenuItem key={u.id} value={String(u.id)}>{u.name}</MenuItem>
                ))}
              </TextField>
              <TextField select size='small' label='Status' sx={{ minWidth: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <MenuItem value='all'>All Statuses</MenuItem>
                <MenuItem value='pending'>Pending</MenuItem>
                <MenuItem value='approved'>Approved</MenuItem>
                <MenuItem value='paid'>Paid</MenuItem>
              </TextField>
              <TextField size='small' type='date' label='From' InputLabelProps={{ shrink: true }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <TextField size='small' type='date' label='To' InputLabelProps={{ shrink: true }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              <Box flexGrow={1} />
              <Button
                variant='contained'
                disabled={selected.length === 0}
                startIcon={<i className='ri-bank-card-line' />}
                onClick={() => void handleBulkMarkPaid()}
              >
                Mark {selected.length || ''} Paid
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box display='flex' justifyContent='center' p={10}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell padding='checkbox'>
                        <Checkbox
                          checked={eligibleCount > 0 && selected.length === eligibleCount}
                          indeterminate={selected.length > 0 && selected.length < eligibleCount}
                          onChange={toggleSelectAll}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Salesman</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Scheme</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Rule Source</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 600 }}>Base Amount</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 600 }}>Commission</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11}>
                          <Typography color='text.secondary' sx={{ p: 4, textAlign: 'center' }}>
                            No commission entries match these filters.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {entries.map(entry => (
                      <TableRow key={entry.id} hover>
                        <TableCell padding='checkbox'>
                          <Checkbox
                            disabled={entry.status === 'paid'}
                            checked={selected.includes(entry.id)}
                            onChange={() => toggleSelected(entry.id)}
                          />
                        </TableCell>
                        <TableCell>{new Date(entry.commission_date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>{entry.salesman?.name ?? `#${entry.salesman_id}`}</TableCell>
                        <TableCell>{entry.customer?.name ?? '—'}</TableCell>
                        <TableCell>{entry.scheme?.name ?? '—'}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{entry.commission_type?.name ?? entry.event_type}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{entry.rule_source}</TableCell>
                        <TableCell align='right'>{money.format(Number(entry.base_amount))}</TableCell>
                        <TableCell align='right' sx={{ fontWeight: 600 }}>{money.format(Number(entry.commission_amount))}</TableCell>
                        <TableCell>
                          <Chip size='small' label={entry.status} color={getStatusColor(entry.status)} variant='tonal' sx={{ textTransform: 'capitalize' }} />
                        </TableCell>
                        <TableCell align='right'>
                          {entry.status === 'pending' && (
                            <Button size='small' onClick={() => void handleApprove(entry.id)}>Approve</Button>
                          )}
                          {entry.status !== 'paid' && (
                            <Button size='small' color='success' onClick={() => void handleMarkPaid(entry.id)}>Mark Paid</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default CommissionLedgerPage
