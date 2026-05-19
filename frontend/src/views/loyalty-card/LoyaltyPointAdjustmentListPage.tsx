'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import InputAdornment from '@mui/material/InputAdornment'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import TablePagination from '@mui/material/TablePagination'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'
import { resolveBackendApiUrl } from '../customers/customerData'

interface AdjustmentRecord {
  voucher_no: string
  transaction_date: string
  customer_id: number
  customer?: {
    name: string
    loyalty_card_no: string
  }
  add_points: string
  redeem_points: string
}

const LoyaltyPointAdjustmentListPage = ({ 
  onAddNew, 
  onEdit 
}: { 
  onAddNew: () => void
  onEdit: (voucherNo: string) => void 
}) => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AdjustmentRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(15)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchAdjustments = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const response = await fetch(
        `${resolveBackendApiUrl()}/loyalty-point-adjustments?page=${page + 1}&per_page=${rowsPerPage}&search=${search}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`
          }
        }
      )
      const payload = await response.json()
      setData(payload.data || [])
      setTotal(payload.total || 0)
    } catch (err) {
      console.error('Failed to fetch adjustments', err)
    } finally {
      setLoading(false)
    }
  }, [accessToken, page, rowsPerPage, search])

  const handleDelete = async (voucherNo: string) => {
    if (!window.confirm(`Are you sure you want to delete adjustment voucher "${voucherNo}"? This will reverse the loyalty points added/redeemed for the customer.`)) {
      return
    }

    if (!accessToken) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(
        `${resolveBackendApiUrl()}/loyalty-point-adjustments/${encodeURIComponent(voucherNo)}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`
          }
        }
      )

      const payload = await response.json()
      if (response.ok) {
        setSuccess(payload.message || 'Loyalty point adjustment deleted successfully')
        fetchAdjustments()
      } else {
        setError(payload.message || 'Failed to delete adjustment')
      }
    } catch (err) {
      console.error('Failed to delete adjustment', err)
      setError('An error occurred while deleting the adjustment')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdjustments()
  }, [fetchAdjustments])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card
          sx={{
            color: 'common.white',
            background: 'linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)',
            borderRadius: 2
          }}
        >
          <CardContent sx={{ p: 5 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Stack spacing={1}>
                <Typography variant='h4' sx={{ color: 'common.white', fontWeight: 700 }}>
                  Loyalty Adjustment History
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  View and manage manual point additions and redemptions.
                </Typography>
              </Stack>
              <Button
                variant='contained'
                color='secondary'
                startIcon={<i className='ri-add-line' />}
                onClick={onAddNew}
                sx={{ 
                  bgcolor: 'common.white', 
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                  fontWeight: 600
                }}
              >
                Create New Adjustment
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        {error && <Box sx={{ mb: 4 }}><Alert severity='error' onClose={() => setError(null)}>{error}</Alert></Box>}
        {success && <Box sx={{ mb: 4 }}><Alert severity='success' onClose={() => setSuccess(null)}>{success}</Alert></Box>}
        <Card variant='outlined'>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <TextField
                size='small'
                placeholder='Search by Voucher, Name or Card...'
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <i className='ri-search-line' />
                    </InputAdornment>
                  )
                }}
                sx={{ width: 350 }}
              />
            </Box>
            <TableContainer component={Paper} elevation={0}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{ bgcolor: 'background.default' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Voucher No.</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Voucher Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Card No</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700 }}>Add Point</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700 }}>Redeem Point</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align='center' sx={{ py: 10 }}>
                        <i className='ri-loader-4-line animate-spin' style={{ fontSize: '24px' }} />
                        <Typography sx={{ mt: 2 }}>Loading records...</Typography>
                      </TableCell>
                    </TableRow>
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align='center' sx={{ py: 10 }}>
                        <Typography color='text.secondary'>No adjustments found.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant='body2' sx={{ fontWeight: 600, color: 'primary.main' }}>
                            {row.voucher_no}
                          </Typography>
                        </TableCell>
                        <TableCell>{new Date(row.transaction_date).toLocaleDateString()}</TableCell>
                        <TableCell>{row.customer?.name}</TableCell>
                        <TableCell>
                          <Chip label={row.customer?.loyalty_card_no} size='small' variant='outlined' sx={{ fontWeight: 500 }} />
                        </TableCell>
                        <TableCell align='right'>
                          <Typography sx={{ color: 'success.main', fontWeight: 600 }}>
                            {Number(row.add_points) > 0 ? `+${Number(row.add_points).toFixed(2)}` : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography sx={{ color: 'error.main', fontWeight: 600 }}>
                            {Number(row.redeem_points) > 0 ? `-${Number(row.redeem_points).toFixed(2)}` : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align='center'>
                          <Stack direction='row' spacing={1} justifyContent='center'>
                            <Tooltip title="Edit">
                              <IconButton size='small' color='primary' onClick={() => onEdit(row.voucher_no)}>
                                <i className='ri-edit-box-line' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size='small' color='error' onClick={() => handleDelete(row.voucher_no)}>
                                <i className='ri-delete-bin-line' />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component='div'
              count={total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => setRowsPerPage(parseInt(e.target.value, 10))}
              rowsPerPageOptions={[15, 25, 50]}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default LoyaltyPointAdjustmentListPage
