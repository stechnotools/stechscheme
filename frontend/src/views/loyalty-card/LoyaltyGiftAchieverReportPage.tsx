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
import Chip from '@mui/material/Chip'
import { resolveBackendApiUrl } from '../customers/customerData'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

interface Achiever {
  id: number
  cardNo: string
  customer: string
  mobile: string
  achieved_level: string
  points: string
  target_level: string
  target_points: string
  gift_achieved: string
  gift_status: 'Pending' | 'Delivered'
  achieved_date: string | null
}

const LoyaltyGiftAchieverReportPage = () => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Achiever[]>([])
  const [search, setSearch] = useState('')
  const [minPoints, setMinPoints] = useState('100')

  // Edit State
  const [editOpen, setEditOpen] = useState(false)
  const [selectedAchiever, setSelectedAchiever] = useState<Achiever | null>(null)
  const [editData, setEditData] = useState({
    mobile: '',
    gift_status: 'Pending' as 'Pending' | 'Delivered'
  })
  const [updateLoading, setUpdateLoading] = useState(false)

  const fetchReport = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    try {
      const url = new URL(`${resolveBackendApiUrl()}/loyalty-reports/gift-achiever`)
      if (search) url.searchParams.append('search', search)
      if (minPoints) url.searchParams.append('min_points', minPoints)

      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })
      const payload = await response.json()
      setData(payload)
    } catch (err) {
      setError('Failed to fetch gift achiever report')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [accessToken, search, minPoints])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handlePrint = () => {
    window.print()
  }

  const handleEditOpen = (achiever: Achiever) => {
    setSelectedAchiever(achiever)
    setEditData({
      mobile: achiever.mobile,
      gift_status: achiever.gift_status || 'Pending'
    })
    setEditOpen(true)
  }

  const handleUpdateStatus = async () => {
    if (!selectedAchiever || !accessToken) return
    setUpdateLoading(true)
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/loyalty-reports/gift-achiever/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          id: selectedAchiever.id,
          mobile: editData.mobile,
          gift_status: editData.gift_status
        })
      })
      const result = await response.json()
      if (result.success) {
        setEditOpen(false)
        fetchReport()
      } else {
        alert(result.message || 'Update failed')
      }
    } catch (err) {
      console.error(err)
      alert('Network error')
    } finally {
      setUpdateLoading(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            color: 'common.white',
            background: 'linear-gradient(135deg, #1e293b 0%, #10b981 100%)',
            borderRadius: 2
          }}
        >
          <CardContent sx={{ p: 5 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Stack spacing={1}>
                <Typography variant='h4' sx={{ color: 'common.white', fontWeight: 700 }}>
                  Gift Achiver Report
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Identify top-performing loyalty members eligible for rewards and gifts.
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
                  label='Search Customer'
                  size='small'
                  placeholder='Name, Mobile or Card No...'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  sx={{ width: 300 }}
                />
                <TextField
                  label='Min. Points'
                  type='number'
                  size='small'
                  value={minPoints}
                  onChange={e => setMinPoints(e.target.value)}
                  sx={{ width: 120 }}
                />
                <Button variant='contained' onClick={fetchReport}>
                  Filter
                </Button>
                <Button variant='outlined' onClick={() => { setSearch(''); setMinPoints('100'); }}>
                  Reset
                </Button>
              </Stack>

              {error && <Alert severity='error'>{error}</Alert>}

              <TableContainer component={Paper} variant='outlined'>
                <Table>
                  <TableHead sx={{ bgcolor: 'background.default' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Card No</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Achieved Level</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Points Balance</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 700 }}>Gift Achieved</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 700 }}>Achieved Date</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>Next Target</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 700 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} align='center' sx={{ py: 10 }}>
                          <i className='ri-loader-4-line animate-spin' style={{ fontSize: '24px' }} />
                        </TableCell>
                      </TableRow>
                    ) : data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align='center' sx={{ py: 10 }}>
                          No gift achievers found matching the criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((row) => (
                        <TableRow key={row.id} hover>
                           <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>{row.cardNo}</TableCell>
                           <TableCell>
                             <Typography sx={{ fontWeight: 500 }}>{row.customer}</Typography>
                             <Typography variant='caption' color='text.secondary'>{row.mobile}</Typography>
                           </TableCell>
                           <TableCell>
                             <Chip 
                               label={row.achieved_level} 
                               size='small' 
                               variant='tonal'
                               color={row.achieved_level.toLowerCase().includes('gold') ? 'warning' : row.achieved_level.toLowerCase().includes('platinum') ? 'primary' : 'default'}
                             />
                           </TableCell>
                           <TableCell align='right' sx={{ fontWeight: 700 }}>
                             {Number(row.points).toLocaleString()}
                           </TableCell>
                           <TableCell align='center'>
                             {row.gift_achieved !== 'No Gift' ? (
                               <Chip 
                                 label={row.gift_achieved} 
                                 size='small' 
                                 icon={<i className='ri-gift-2-line' />}
                                 sx={{ 
                                   fontWeight: 700,
                                   bgcolor: 'success.main',
                                   color: 'white',
                                   '& .MuiChip-icon': { color: 'inherit' }
                                 }}
                               />
                             ) : (
                               <Typography variant='body2' color='text.disabled'>-</Typography>
                             )}
                           </TableCell>
                           <TableCell align='center'>
                             <Chip 
                               label={row.gift_status} 
                               size='small' 
                               variant='outlined'
                               color={row.gift_status === 'Delivered' ? 'success' : 'warning'}
                             />
                           </TableCell>
                           <TableCell align='center'>
                             <Typography variant='body2' sx={{ fontWeight: 500 }}>
                               {row.achieved_date ? new Date(row.achieved_date).toLocaleDateString() : '-'}
                             </Typography>
                           </TableCell>
                           <TableCell align='right'>
                             <Box>
                               <Typography variant='body2' sx={{ fontWeight: 600, color: 'text.primary' }}>{row.target_level}</Typography>
                               <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                                 Goal: {Number(row.target_points).toLocaleString()}
                               </Typography>
                             </Box>
                           </TableCell>
                           <TableCell align='center'>
                             <Button 
                               variant='outlined' 
                               size='small' 
                               onClick={() => handleEditOpen(row)}
                               startIcon={<i className='ri-edit-line' />}
                             >
                               Status
                             </Button>
                           </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Edit Status Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>Update Delivery Status</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 4, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 300 }}>
            <Typography variant='body2' color='text.secondary'>
              Updating status for: <strong>{selectedAchiever?.customer}</strong>
            </Typography>
            <TextField
              label="Mobile Number"
              fullWidth
              size="small"
              value={editData.mobile}
              onChange={(e) => setEditData({ ...editData, mobile: e.target.value })}
            />
            <TextField
              select
              label="Gift Status"
              fullWidth
              size="small"
              value={editData.gift_status}
              onChange={(e) => setEditData({ ...editData, gift_status: e.target.value as any })}
              SelectProps={{ native: true }}
            >
              <option value="Pending">Pending</option>
              <option value="Delivered">Delivered</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 6 }}>
          <Button onClick={() => setEditOpen(false)} color="secondary">Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleUpdateStatus} 
            disabled={updateLoading}
          >
            {updateLoading ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default LoyaltyGiftAchieverReportPage
