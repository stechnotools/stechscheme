'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import { resolveBackendApiUrl } from '../customers/customerData'

interface CategoryStat {
  category: string
  category_code: string
  total_customers: number
  current_balance: string
  range_added: string
  range_redeemed: string
}

const LoyaltyCategoryWiseReportPage = () => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CategoryStat[]>([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Keyboard navigation & Detail states
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<any>(null)
  const [categoryCustomers, setCategoryCustomers] = useState<any[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchReport = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    try {
      const url = new URL(`${resolveBackendApiUrl()}/loyalty-reports/category-wise`)
      if (fromDate) url.searchParams.append('from_date', fromDate)
      if (toDate) url.searchParams.append('to_date', toDate)

      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })
      const payload = await response.json()
      setData(payload)
    } catch (err) {
      setError('Failed to fetch category report')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [accessToken, fromDate, toDate])

  const openCategoryDetail = async (row: any) => {
    setSelectedCategory(row)
    setDetailOpen(true)
    setDetailLoading(true)
    setCategoryCustomers([])
    try {
      const params = new URLSearchParams({
        category: row.category_code,
        per_page: '100' // Load up to 100 customers in category
      })
      if (fromDate) params.append('from_date', fromDate)
      if (toDate) params.append('to_date', toDate)
      params.append('non_zero_only', '0') // Show all category members regardless of 0 balance

      const res = await fetch(`${resolveBackendApiUrl()}/loyalty-reports/ledger?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })
      const payload = await res.json()
      setCategoryCustomers(payload.data || [])
    } catch (err) {
      console.error('Failed to load category details', err)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  // Automatically highlight/select the first row on list load
  useEffect(() => {
    if (data.length > 0) {
      if (selectedRowIndex === null || selectedRowIndex >= data.length) {
        setSelectedRowIndex(0)
      }
    } else {
      setSelectedRowIndex(null)
    }
  }, [data, selectedRowIndex])

  const handlePrint = () => {
    window.print()
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            color: 'common.white',
            background: 'linear-gradient(135deg, #1e293b 0%, #6366f1 100%)',
            borderRadius: 2
          }}
        >
          <CardContent sx={{ p: 5 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Stack spacing={1}>
                <Typography variant='h4' sx={{ color: 'common.white', fontWeight: 700 }}>
                  Card Category Wise Report
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Analyze loyalty point statistics grouped by customer categories.
                </Typography>
              </Stack>
              <Button
                variant='contained'
                color='secondary'
                startIcon={<i className='ri-printer-line' />}
                onClick={handlePrint}
                sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
              >
                Print Report
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card variant='outlined'>
          <CardContent>
            <Stack spacing={6}>
              <Stack direction='row' spacing={4} alignItems='flex-end'>
                <TextField
                  label='From Date'
                  type='date'
                  size='small'
                  InputLabelProps={{ shrink: true }}
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                />
                <TextField
                  label='To Date'
                  type='date'
                  size='small'
                  InputLabelProps={{ shrink: true }}
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                />
                <Button variant='contained' onClick={fetchReport}>
                  Filter
                </Button>
                <Button variant='outlined' onClick={() => { setFromDate(''); setToDate(''); }}>
                  Reset
                </Button>
              </Stack>

              {error && <Alert severity='error'>{error}</Alert>}

              <TableContainer component={Paper} variant='outlined'>
                <Table>
                  <TableHead sx={{ bgcolor: 'background.default' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Category Name</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 700 }}>Total Customers</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Points Added (Range)</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Points Redeemed (Range)</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Current Points Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} align='center' sx={{ py: 10 }}>
                          <i className='ri-loader-4-line animate-spin' style={{ fontSize: '24px' }} />
                        </TableCell>
                      </TableRow>
                    ) : data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align='center' sx={{ py: 10 }}>
                          No data found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((row, idx) => (
                        <TableRow 
                          key={idx} 
                          hover
                          tabIndex={0}
                          selected={selectedRowIndex === idx}
                          onClick={() => setSelectedRowIndex(idx)}
                          onDoubleClick={() => openCategoryDetail(row)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              openCategoryDetail(row)
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault()
                              if (idx < data.length - 1) {
                                setSelectedRowIndex(idx + 1)
                                const nextRow = document.getElementById(`cat-row-${idx + 1}`)
                                nextRow?.focus()
                              }
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              if (idx > 0) {
                                setSelectedRowIndex(idx - 1)
                                const prevRow = document.getElementById(`cat-row-${idx - 1}`)
                                prevRow?.focus()
                              }
                            }
                          }}
                          id={`cat-row-${idx}`}
                          sx={{
                            cursor: 'pointer',
                            '&:focus': {
                              backgroundColor: 'rgba(99, 102, 241, 0.08) !important',
                              outline: '2px solid #6366f1',
                              outlineOffset: '-2px'
                            },
                            '&.Mui-selected': {
                              backgroundColor: 'rgba(99, 102, 241, 0.12) !important',
                              borderLeft: '4px solid #6366f1',
                              '&:focus': {
                                backgroundColor: 'rgba(99, 102, 241, 0.18) !important'
                              },
                              '&:hover': {
                                backgroundColor: 'rgba(99, 102, 241, 0.18) !important'
                              }
                            }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600 }}>{row.category}</TableCell>
                          <TableCell align='center'>{row.total_customers}</TableCell>
                          <TableCell align='right' sx={{ color: 'success.main', fontWeight: 600 }}>
                            {Number(row.range_added).toLocaleString()}
                          </TableCell>
                          <TableCell align='right' sx={{ color: 'error.main', fontWeight: 600 }}>
                            {Number(row.range_redeemed).toLocaleString()}
                          </TableCell>
                          <TableCell align='right' sx={{ fontWeight: 700 }}>
                            {Number(row.current_balance).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {data.length > 0 && (
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>TOTAL</TableCell>
                        <TableCell align='center' sx={{ fontWeight: 800 }}>
                          {data.reduce((acc, curr) => acc + curr.total_customers, 0)}
                        </TableCell>
                        <TableCell align='right' sx={{ fontWeight: 800 }}>
                          {data.reduce((acc, curr) => acc + Number(curr.range_added), 0).toLocaleString()}
                        </TableCell>
                        <TableCell align='right' sx={{ fontWeight: 800 }}>
                          {data.reduce((acc, curr) => acc + Number(curr.range_redeemed), 0).toLocaleString()}
                        </TableCell>
                        <TableCell align='right' sx={{ fontWeight: 800 }}>
                          {data.reduce((acc, curr) => acc + Number(curr.current_balance), 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                  )}
                </Table>
              </TableContainer>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Category Members Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="span" fontWeight="bold">
            Category Details: {selectedCategory?.category} ({selectedCategory?.category_code})
          </Typography>
          <IconButton onClick={() => setDetailOpen(false)}>
            <i className="ri-close-line" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box mb={4} display="flex" flexWrap="wrap" gap={4} alignItems="center">
             <Typography variant="body2" color="textSecondary">
               Category Name: <b>{selectedCategory?.category}</b>
             </Typography>
             <Typography variant="body2" color="textSecondary">
               Total Customers: <b>{selectedCategory?.total_customers}</b>
             </Typography>
             <Typography variant="body2" color="textSecondary">
               Range Added: <b>{selectedCategory?.range_added}</b>
             </Typography>
             <Typography variant="body2" color="textSecondary">
               Range Redeemed: <b>{selectedCategory?.range_redeemed}</b>
             </Typography>
             <Typography variant="body2" color="textSecondary">
               Current Points Balance: <b>{selectedCategory?.current_balance}</b>
             </Typography>
          </Box>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: 'background.default' }}>
                <TableRow>
                  <TableCell><b>Card No</b></TableCell>
                  <TableCell><b>Customer Name</b></TableCell>
                  <TableCell><b>Mobile Number</b></TableCell>
                  <TableCell align="right"><b>Opening Points</b></TableCell>
                  <TableCell align="right" sx={{ color: 'success.main' }}><b>Added (Range)</b></TableCell>
                  <TableCell align="right" sx={{ color: 'error.main' }}><b>Redeemed (Range)</b></TableCell>
                  <TableCell align="right" sx={{ color: 'primary.main' }}><b>Current Balance</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detailLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : categoryCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      No customers found in this category.
                    </TableCell>
                  </TableRow>
                ) : (
                  categoryCustomers.map((cust: any) => (
                    <TableRow key={cust.id} hover>
                      <TableCell>{cust.cardNo}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{cust.customer}</TableCell>
                      <TableCell>{cust.mobile}</TableCell>
                      <TableCell align="right">{cust.opening}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 500 }}>+{cust.added}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 500 }}>-{cust.redeemed}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{cust.closing}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDetailOpen(false)} variant="outlined">Close</Button>
          <Button variant="contained" color="primary" startIcon={<i className="ri-printer-line" />} onClick={() => window.print()}>
            Print Details
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default LoyaltyCategoryWiseReportPage

