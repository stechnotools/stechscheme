'use client'

import React, { useState, useEffect, useCallback } from 'react'

import { useSession } from 'next-auth/react'
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Divider,
  Paper,
  InputAdornment,
  Tooltip,
  Chip,
  TablePagination,
  TableSortLabel,
  CircularProgress,
  Checkbox
} from '@mui/material'

import { resolveBackendApiUrl } from '../customers/customerData'

const CustomerLoyaltyLedgerPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as any)?.accessToken

  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [branches, setBranches] = useState<any[]>([])
  const [nonZeroOnly, setNonZeroOnly] = useState(true)
  
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [ledgerDetails, setLedgerDetails] = useState<any[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null)

  // Pagination states
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalRows, setTotalRows] = useState(0)

  // Sorting state
  const [orderBy, setOrderBy] = useState('loyalty_card_no')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')

  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

      const payload = await response.json().catch(() => null)

      if (!response.ok) throw new Error(payload?.message || 'Request failed')
      
      return payload
    },
    [accessToken]
  )

  const loadData = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)

    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        per_page: rowsPerPage.toString(),
        sort_by: orderBy,
        sort_order: order
      })

      if (search) params.append('search', search)
      if (fromDate) params.append('from_date', fromDate)
      if (toDate) params.append('to_date', toDate)
      if (branchFilter && branchFilter !== 'All') params.append('branch', branchFilter)
      params.append('non_zero_only', nonZeroOnly ? '1' : '0')
      
      const res = await request<any>(`/loyalty-reports/ledger?${params.toString()}`)

      setData(res.data || [])
      setTotalRows(res.total || 0)
      setSummary(res.summary || null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [accessToken, request, page, rowsPerPage, orderBy, order, search, fromDate, toDate, branchFilter, nonZeroOnly])

  useEffect(() => {
    setPage(0)
  }, [search, fromDate, toDate, branchFilter, nonZeroOnly])

  useEffect(() => {
    if (status === 'authenticated') {
      void loadData()
    }
  }, [status, loadData])

  useEffect(() => {
    if (data.length > 0) {
      if (!selectedRowId || !data.some(r => r.id === selectedRowId)) {
        setSelectedRowId(data[0].id)
      }
    } else {
      setSelectedRowId(null)
    }
  }, [data, selectedRowId])

  useEffect(() => {
    if (accessToken) {
      fetch(`${resolveBackendApiUrl()}/branches`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })
      .then(res => res.json())
      .then(json => {
        if (json && Array.isArray(json)) {
          setBranches(json)
        } else if (json && json.data && Array.isArray(json.data)) {
          setBranches(json.data)
        }
      })
      .catch(err => console.error('Error fetching branches', err))
    }
  }, [accessToken])

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc'

    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const openLedger = async (customer: any) => {
    setSelectedCustomer(customer)
    setLedgerOpen(true)
    setLedgerLoading(true)
    setLedgerDetails([])

    try {
      const params = new URLSearchParams()

      if (fromDate) params.append('from_date', fromDate)
      if (toDate) params.append('to_date', toDate)
      
      const res = await request<any>(`/loyalty-reports/ledger/${customer.id}?${params.toString()}`)

      setLedgerDetails(res.ledgers || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLedgerLoading(false)
    }
  }

  const handleFilter = () => {
    setPage(0)
    void loadData()
  }

  const handleClear = () => {
    setSearch('')
    setBranchFilter('All')
    setFromDate('')
    setToDate('')
    setPage(0)
    setOrderBy('loyalty_card_no')
    setOrder('asc')
  }

  const handleSync = async () => {
    if (!confirm('This will recalculate all customer loyalty balances based on their ledger entries. Are you sure?')) return
    
    setSyncing(true)
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      const res = await request<any>('/loyalty-reports/sync-balances', { method: 'POST' })
      setSuccessMsg(res.message)
      void loadData()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={3}>
              <Box display="flex" flexDirection="column" gap={1}>
                <Typography variant="h5" color="primary" fontWeight="bold">
                  Customer Loyalty Ledger
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Checkbox
                    size="small"
                    checked={nonZeroOnly}
                    onChange={(e) => setNonZeroOnly(e.target.checked)}
                    sx={{ p: 0 }}
                  />
                  <Typography 
                    variant="caption" 
                    color="textSecondary" 
                    sx={{ cursor: 'pointer', userSelect: 'none', fontWeight: 500 }}
                    onClick={() => setNonZeroOnly(!nonZeroOnly)}
                  >
                    Showing only customers with non-zero loyalty points balance
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" gap={2}>
                <Button variant="outlined" color="primary" startIcon={<i className="ri-file-pdf-line" />}>
                  Export PDF
                </Button>
                <Button variant="contained" color="success" startIcon={<i className="ri-file-excel-line" />}>
                  Export Excel
                </Button>
              </Box>
            </Box>

            {successMsg && (
              <Box sx={{ mb: 4, p: 3, bgcolor: 'success.lighter', color: 'success.dark', borderRadius: 1, border: '1px solid', borderColor: 'success.light', display: 'flex', alignItems: 'center', gap: 2 }}>
                <i className="ri-checkbox-circle-line" />
                <Typography variant="body2">{successMsg}</Typography>
                <Box flexGrow={1} />
                <IconButton size="small" onClick={() => setSuccessMsg(null)}><i className="ri-close-line" /></IconButton>
              </Box>
            )}

            {errorMsg && (
              <Box sx={{ mb: 4, p: 3, bgcolor: 'error.lighter', color: 'error.dark', borderRadius: 1, border: '1px solid', borderColor: 'error.light', display: 'flex', alignItems: 'center', gap: 2 }}>
                <i className="ri-error-warning-line" />
                <Typography variant="body2">{errorMsg}</Typography>
                <Box flexGrow={1} />
                <IconButton size="small" onClick={() => setErrorMsg(null)}><i className="ri-close-line" /></IconButton>
              </Box>
            )}

            <Divider sx={{ my: 4 }} />

            {/* Summary Cards */}
            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={2.4}>
                <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center', borderStyle: 'dashed', borderColor: 'primary.main', bgcolor: 'primary.lighter' }}>
                  <Typography variant="caption" color="primary.main" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Customers</Typography>
                  <Typography variant="h5" fontWeight="bold" sx={{ mt: 0.5 }}>{summary?.total_customers || 0}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center', borderStyle: 'dashed', borderColor: 'warning.main', bgcolor: 'warning.lighter' }}>
                  <Typography variant="caption" color="warning.main" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Opening Points</Typography>
                  <Typography variant="h5" fontWeight="bold" sx={{ mt: 0.5 }}>{summary?.total_opening_points || 0}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center', borderStyle: 'dashed', borderColor: 'success.main', bgcolor: 'success.lighter' }}>
                  <Typography variant="caption" color="success.main" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Added (In Range)</Typography>
                  <Typography variant="h5" fontWeight="bold" sx={{ mt: 0.5 }}>{summary?.range_added || 0}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center', borderStyle: 'dashed', borderColor: 'error.main', bgcolor: 'error.lighter' }}>
                  <Typography variant="caption" color="error.main" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Redeemed (In Range)</Typography>
                  <Typography variant="h5" fontWeight="bold" sx={{ mt: 0.5 }}>{summary?.range_redeemed || 0}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center', borderStyle: 'dashed', borderColor: 'primary.main', bgcolor: 'primary.lighter' }}>
                  <Typography variant="caption" color="primary.main" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Balance</Typography>
                  <Typography variant="h5" fontWeight="bold" sx={{ mt: 0.5 }}>{summary?.total_points || 0}</Typography>
                </Paper>
              </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />
            
            {/* Filters */}
            <Grid container spacing={4}>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search Customer / Mobile / Card No"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <i className="ri-search-line" />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  select
                  size="small"
                  label="Branch"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                >
                  <MenuItem value="All">All Branches</MenuItem>
                  {branches.map((b: any) => (
                    <MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField fullWidth size="small" type="date" label="From Date" value={fromDate} onChange={e => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField fullWidth size="small" type="date" label="To Date" value={toDate} onChange={e => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box display="flex" gap={2}>
                  <Button fullWidth variant="contained" color="primary" onClick={handleFilter}>
                    <i className="ri-filter-3-line" style={{ marginRight: '8px' }} /> Filter
                  </Button>
                  <Button 
                    fullWidth 
                    variant="tonal" 
                    color="warning" 
                    onClick={handleSync} 
                    disabled={syncing}
                    startIcon={syncing ? <CircularProgress size={16} /> : <i className="ri-refresh-line" />}
                  >
                    Sync
                  </Button>
                  <Button fullWidth variant="outlined" color="secondary" onClick={handleClear}>
                    Clear
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Ledger Data Table */}
      <Grid item xs={12}>
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} elevation={0}>
              <Table size="medium">
                <TableHead sx={{ backgroundColor: 'background.default' }}>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel active={orderBy === 'loyalty_card_no'} direction={order} onClick={() => handleSort('loyalty_card_no')}>
                        <b>Card No</b>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel active={orderBy === 'name'} direction={order} onClick={() => handleSort('name')}>
                        <b>Customer Name</b>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel active={orderBy === 'mobile'} direction={order} onClick={() => handleSort('mobile')}>
                        <b>Mobile Number</b>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell><b>Category</b></TableCell>
                    <TableCell align="right">
                      <b>Opening</b>
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      <b>Added</b>
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      <b>Redeemed</b>
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'primary.main' }}>
                      <b>Current Balance</b>
                    </TableCell>
                    <TableCell align="center"><b>Actions</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => (
                      <TableRow 
                        key={row.id} 
                        hover
                        tabIndex={0}
                        selected={selectedRowId === row.id}
                        onClick={() => setSelectedRowId(row.id)}
                        onDoubleClick={() => openLedger(row)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            openLedger(row)
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            const currentIndex = data.findIndex(r => r.id === row.id)
                            if (currentIndex < data.length - 1) {
                              const nextRowId = data[currentIndex + 1].id
                              setSelectedRowId(nextRowId)
                              const nextRow = document.getElementById(`row-${nextRowId}`)
                              nextRow?.focus()
                            }
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            const currentIndex = data.findIndex(r => r.id === row.id)
                            if (currentIndex > 0) {
                              const prevRowId = data[currentIndex - 1].id
                              setSelectedRowId(prevRowId)
                              const prevRow = document.getElementById(`row-${prevRowId}`)
                              prevRow?.focus()
                            }
                          }
                        }}
                        id={`row-${row.id}`}
                        sx={{
                          cursor: 'pointer',
                          '&:focus': {
                            backgroundColor: 'rgba(59, 130, 246, 0.08) !important',
                            outline: '2px solid #3b82f6',
                            outlineOffset: '-2px'
                          },
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(59, 130, 246, 0.12) !important',
                            borderLeft: '4px solid #3b82f6',
                            '&:focus': {
                              backgroundColor: 'rgba(59, 130, 246, 0.18) !important'
                            },
                            '&:hover': {
                              backgroundColor: 'rgba(59, 130, 246, 0.18) !important'
                            }
                          }
                        }}
                      >
                        <TableCell>{row.cardNo}</TableCell>
                        <TableCell>{row.customer}</TableCell>
                        <TableCell>{row.mobile}</TableCell>
                        <TableCell>
                          {row.category ? (
                            <Chip label={row.category} size="small" color="primary" variant="tonal" />
                          ) : '-'}
                        </TableCell>
                        <TableCell align="right">{row.opening}</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main', fontWeight: 500 }}>+{row.added}</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 500 }}>-{row.redeemed}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{row.closing}</TableCell>
                        <TableCell align="center">
                          <Box display="flex" justifyContent="center" gap={1}>
                            <Tooltip title="View Ledger (Press Enter)">
                              <IconButton color="info" size="small" onClick={() => openLedger(row)}>
                                <i className="ri-history-line" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={totalRows}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Ledger View Dialog */}
      <Dialog open={ledgerOpen} onClose={() => setLedgerOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="span" fontWeight="bold">
            Detailed Ledger: {selectedCustomer?.customer} ({selectedCustomer?.cardNo})
          </Typography>
          <IconButton onClick={() => setLedgerOpen(false)}>
            <i className="ri-close-line" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box mb={4} display="flex" flexWrap="wrap" gap={4} alignItems="center">
             <Typography variant="body2" color="textSecondary">
               Customer Name: <b>{selectedCustomer?.customer}</b>
             </Typography>
             <Typography variant="body2" color="textSecondary">
               Category Code: <b>{selectedCustomer?.category ? selectedCustomer.category.charAt(0).toUpperCase() : 'N/A'}</b>
             </Typography>
             <Typography variant="body2" color="textSecondary">
               Category Name: <b>{selectedCustomer?.category || 'None'}</b>
             </Typography>
             <Typography variant="body2" color="textSecondary">
               Branch: <b>{selectedCustomer?.branch}</b>
             </Typography>
          </Box>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: 'background.default' }}>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">GST Taxable Amt</TableCell>
                  <TableCell align="right">Net Weight</TableCell>
                  <TableCell align="right">Points</TableCell>
                  <TableCell align="right">Running Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ledgerLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : ledgerDetails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgerDetails.map((log: any) => (
                    <TableRow key={log.id} hover>
                      <TableCell>{log.date}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{log.description}</Typography>
                          {log.metal_name && (
                            <Typography variant="caption" color="textSecondary">
                              Metal: {log.metal_name}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={log.type} 
                          color={log.type === 'Added' ? 'success' : 'error'} 
                          size="small" 
                          variant="outlined" 
                        />
                      </TableCell>
                      <TableCell align="right">
                        {log.gst_taxable_amt ? `₹${Number(log.gst_taxable_amt).toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {log.net_wt ? `${log.net_wt}g` : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ color: log.type === 'Added' ? 'success.main' : 'error.main', fontWeight: 500 }}>
                        {log.type === 'Added' ? '+' : '-'}{log.points}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{log.balance}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setLedgerOpen(false)} variant="outlined">Close</Button>
          <Button variant="contained" color="primary" startIcon={<i className="ri-printer-line" />}>
            Print Ledger
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default CustomerLoyaltyLedgerPage
