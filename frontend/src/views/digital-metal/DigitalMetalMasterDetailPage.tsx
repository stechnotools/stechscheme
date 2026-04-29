'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Card,
  CardContent,
  Grid,
  Typography,
  Box,
  Stack,
  Breadcrumbs,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress
} from '@mui/material'
import Link from 'next/link'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const DigitalMetalMasterDetailPage = () => {
  const router = useRouter()
  const { id } = useParams()
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  const [metal, setMetal] = React.useState<any>(null)
  const [logs, setLogs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const loadMetal = React.useCallback(async () => {
    if (!accessToken || !id) return

    try {
      const response = await fetch(`${resolveBackendApiUrl()}/digital-metal-masters/${id}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })
      const payload = await response.json()
      if (payload.success) {
        setMetal(payload.data)
      }

      // Fetch logs
      const logResponse = await fetch(`${resolveBackendApiUrl()}/digital-metal-masters/${id}/logs`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })
      const logPayload = await logResponse.json()
      if (logPayload.success) {
        setLogs(logPayload.data)
      }
    } catch (err) {
      console.error('Failed to load metal', err)
    } finally {
      setLoading(false)
    }
  }, [accessToken, id])

  React.useEffect(() => {
    void loadMetal()
  }, [loadMetal])

  const handleDelete = async () => {
    if (!accessToken || !id) return

    try {
      const response = await fetch(`${resolveBackendApiUrl()}/digital-metal-masters/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (response.ok) {
        router.push('/digital-metal/master')
      }
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  const labelSx = { fontWeight: 'bold', color: '#333' }
  const valueSx = { borderBottom: '1px solid #eaeaea', pb: 0.5, color: '#666', minHeight: '1.5em' }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#6366f1' }}>
            Digital Metal Master
          </Typography>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mt: 1 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', color: '#6366f1', textDecoration: 'none' }}>
              <i className="ri-home-fill" />
            </Link>
            <Link href="/digital-metal/master" style={{ color: '#6366f1', textDecoration: 'none' }}>
              Digital Metal Master
            </Link>
            <Typography color="text.primary">Digital Metal Master Detail</Typography>
          </Breadcrumbs>
        </Box>
      </Stack>

      <Card sx={{ borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <CardContent sx={{ p: 8 }}>
          <Typography variant="h6" sx={{ mb: 8, color: '#8b5cf6', fontWeight: 500 }}>
            Digital Metal Master Detail
          </Typography>

            {loading ? (
              <Box display="flex" justifyContent="center" py={10} width="100%">
                <CircularProgress />
              </Box>
            ) : !metal ? (
              <Box display="flex" justifyContent="center" py={10} width="100%">
                <Typography>Metal Master not found.</Typography>
              </Box>
            ) : (
              <Grid container spacing={10}>
                {/* Left Column */}
                <Grid item xs={12} md={6}>
                  <Stack spacing={8}>
                    <Grid container>
                      <Grid item xs={5}><Typography sx={labelSx}>Metal Name</Typography></Grid>
                      <Grid item xs={7}><Typography sx={valueSx}>{metal.metal_name}</Typography></Grid>
                    </Grid>

                    <Grid container>
                      <Grid item xs={5}><Typography sx={labelSx}>Display Text</Typography></Grid>
                      <Grid item xs={7}><Typography sx={valueSx}>{metal.display_text}</Typography></Grid>
                    </Grid>

                    <Grid container>
                      <Grid item xs={5}><Typography sx={labelSx}>Minimum Purchase Amount</Typography></Grid>
                      <Grid item xs={7}><Typography sx={valueSx}>{metal.min_purchase_amount}</Typography></Grid>
                    </Grid>

                    <Grid container>
                      <Grid item xs={5}><Typography sx={labelSx}>Rate Per</Typography></Grid>
                      <Grid item xs={7}>
                        <Box display="flex" justifyContent="space-between" sx={valueSx}>
                          <Typography>{metal.rate_per}</Typography>
                          <Typography>{metal.rate_per_unit}</Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    <Grid container>
                      <Grid item xs={5}><Typography sx={labelSx}>Rate from</Typography></Grid>
                      <Grid item xs={7}><Typography sx={valueSx}>{metal.rate_from}</Typography></Grid>
                    </Grid>

                    <Grid container>
                      <Grid item xs={5}><Typography sx={labelSx}>Buy Markup Amount</Typography></Grid>
                      <Grid item xs={7}><Typography sx={valueSx}>{metal.buy_markup_amount}</Typography></Grid>
                    </Grid>

                    <Grid container>
                      <Grid item xs={5}><Typography sx={labelSx}>Is Decimal Allow</Typography></Grid>
                      <Grid item xs={7}><Typography sx={valueSx}>{metal.is_decimal_allow ? 'Yes' : 'No'}</Typography></Grid>
                    </Grid>
                  </Stack>
                </Grid>

                {/* Right Column */}
                <Grid item xs={12} md={6}>
                  <Stack spacing={8}>
                    <Grid container>
                      <Grid item xs={5}><Typography sx={labelSx}>Purity</Typography></Grid>
                      <Grid item xs={7}><Typography sx={valueSx}>{metal.purity}</Typography></Grid>
                    </Grid>

                    <Grid container>
                      <Grid item xs={5}><Typography sx={labelSx}>Min Purchase Weight</Typography></Grid>
                      <Grid item xs={7}><Typography sx={valueSx}>{metal.min_purchase_weight}</Typography></Grid>
                    </Grid>

                    <Grid container>
                      <Grid item xs={5}><Typography sx={labelSx}>Max Purchase Amount</Typography></Grid>
                      <Grid item xs={7}><Typography sx={valueSx}>{metal.max_purchase_amount}</Typography></Grid>
                    </Grid>

                    <Grid container>
                      <Grid item xs={5}><Typography sx={labelSx}>Rate Per Display Text</Typography></Grid>
                      <Grid item xs={7}><Typography sx={valueSx}>{metal.rate_per_display_text}</Typography></Grid>
                    </Grid>

                    <Grid container>
                      <Grid item xs={5}><Typography sx={labelSx}>ERP Metal Id</Typography></Grid>
                      <Grid item xs={7}><Typography sx={valueSx}>{metal.erp_metal_id}</Typography></Grid>
                    </Grid>

                    <Grid container>
                      <Grid item xs={5}><Typography sx={labelSx}>Sell Markup Amount</Typography></Grid>
                      <Grid item xs={7}><Typography sx={valueSx}>{metal.sell_markup_amount}</Typography></Grid>
                    </Grid>

                    <Grid container>
                      <Grid item xs={5}><Typography sx={labelSx}>Status</Typography></Grid>
                      <Grid item xs={7}><Typography sx={valueSx} style={{ color: metal.status === 'Active' ? '#28a745' : '#6c757d' }}>{metal.status}</Typography></Grid>
                    </Grid>
                  </Stack>
                </Grid>
              </Grid>
            )}
          <Box mt={12} display="flex" justifyContent="space-between">
            <Button
              variant="outlined"
              onClick={() => router.back()}
              sx={{ 
                borderColor: '#6366f1', 
                color: '#6366f1', 
                '&:hover': { borderColor: '#4f46e5', backgroundColor: 'rgba(99, 102, 241, 0.04)' },
                textTransform: 'none', 
                px: 8 
              }}
            >
              Back
            </Button>
            <Stack direction="row" spacing={4}>

              <Button
                variant="contained"
                color="error"
                onClick={() => setDeleteDialogOpen(true)}
                sx={{ 
                  backgroundColor: '#ea5455', 
                  '&:hover': { backgroundColor: '#e32223' },
                  textTransform: 'none', 
                  px: 8 
                }}
              >
                Delete
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Activity Logs Section */}
      <Card sx={{ mt: 8, borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <CardContent sx={{ p: 6 }}>
          <Typography variant="h6" sx={{ mb: 6, color: '#6366f1', fontWeight: 500 }}>
            Activity History
          </Typography>
          <Divider sx={{ mb: 6 }} />
          
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Updated By</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Old Rate</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>New Rate</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Old Markup (B/S)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>New Markup (B/S)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      No history found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell>{log.user?.name || 'System'}</TableCell>
                      <TableCell>Rate Update</TableCell>
                      <TableCell>{log.old_rate}</TableCell>
                      <TableCell sx={{ color: parseFloat(log.new_rate) > parseFloat(log.old_rate) ? 'success.main' : 'error.main' }}>
                        {log.new_rate}
                      </TableCell>
                      <TableCell>{log.old_buy_markup} / {log.old_sell_markup}</TableCell>
                      <TableCell>{log.new_buy_markup} / {log.new_sell_markup}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Digital Metal Master?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this metal master? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ pb: 4, px: 4 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default DigitalMetalMasterDetailPage
