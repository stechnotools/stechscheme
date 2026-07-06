'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Box,
  Stack,
  MenuItem,
  Divider,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

import { getApiBaseUrl } from '@/libs/runtimeConfig'

const resolveBackendApiUrl = getApiBaseUrl

const backendApiUrl = resolveBackendApiUrl()

const DigitalMetalSaleDetailPage = () => {
  const router = useRouter()
  const { id } = useParams()
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [sale, setSale] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!accessToken || !id) return
    setLoading(true)
    try {
      const response = await fetch(`${backendApiUrl}/digital-metal-sales/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
      })
      const json = await response.json()
      if (json.success) {
        setSale(json.data)
      } else {
        setError(json.message || 'Failed to load sale details')
      }
    } catch (err) {
      setError('An error occurred while fetching details')
    } finally {
      setLoading(false)
    }
  }, [accessToken, id])

  useEffect(() => {
    if (status === 'authenticated') fetchData()
  }, [status, fetchData])

  if (loading) return <Box display="flex" justifyContent="center" py={20}><CircularProgress /></Box>
  if (error) return <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert><Button component={Link} href="/digital-metal/sales" sx={{ mt: 4 }}>Back to List</Button></Box>
  if (!sale) return null

  return (
    <Box sx={{ p: 4, bgcolor: '#f1f5f9', minHeight: '100vh' }}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 9 }}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <CardContent sx={{ p: 6 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 6 }}>
                <Stack direction="row" spacing={4} alignItems="center">
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>Sale Details</Typography>
                  <Chip label={sale.status} color={sale.status === 'Completed' ? 'success' : 'warning'} />
                </Stack>
                <Stack direction="row" spacing={4}>
                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" color="text.secondary">VOUCHER NO</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{sale.voucher_no || 'N/A'}</Typography>
                  </Box>
                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <Typography variant="caption" color="text.secondary">DATE</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{new Date(sale.voucher_date || sale.created_at).toLocaleDateString()}</Typography>
                  </Box>
                </Stack>
              </Box>

              <Grid container spacing={6} sx={{ mb: 6 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Customer Information</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{sale.customer?.name}</Typography>
                  <Typography variant="body2">{sale.customer?.mobile}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{sale.customer?.kyc?.address || 'No address provided'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Sales Representative</Typography>
                  <Typography variant="body1">{sale.salesman || 'N/A'}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 6 }} />

              <TableContainer component={Paper} variant="outlined" sx={{ mb: 6, borderRadius: '8px' }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>ITEM NAME</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">WEIGHT</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">PCS</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">RATE</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">AMOUNT</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">GST</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">TOTAL</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>{sale.digital_metal_master?.metal_name} ({sale.digital_metal_master?.purity})</TableCell>
                      <TableCell align="right">{sale.weight} gm</TableCell>
                      <TableCell align="right">{sale.pcs || 1}</TableCell>
                      <TableCell align="right">{sale.rate_per_gm}</TableCell>
                      <TableCell align="right">{((parseFloat(sale.weight) || 0) * (parseFloat(sale.rate_per_gm) || 0)).toFixed(2)}</TableCell>
                      <TableCell align="right">{sale.gst_amount}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#6366f1' }}>₹{sale.total_amount}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Box display="flex" justifyContent="flex-end">
                <Button component={Link} href="/digital-metal/sales" variant="outlined" sx={{ mr: 2 }}>Back to List</Button>
                <Button component={Link} href={`/digital-metal/sales/${id}/edit`} variant="contained" sx={{ bgcolor: '#6366f1' }}>Edit Sale</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ height: '100%', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <Box sx={{ bgcolor: '#fbbf24', py: 3, color: 'black', textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Payment Summary</Typography>
            </Box>
            <CardContent sx={{ p: 5 }}>
              <Stack spacing={4}>
                  <Box display="flex" justifyContent="space-between"><Typography color="text.secondary">Item Total</Typography><Typography sx={{ fontWeight: 700 }}>₹{sale.total_amount}</Typography></Box>
                  <Divider />
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8' }}>SETTLEMENT DETAILS</Typography>
                  {sale.payment_details?.map((p: any, i: number) => (
                    <Box key={i} display="flex" justifyContent="space-between" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '8px' }}>
                      <Typography variant="body2">{p.mode}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{p.amount}</Typography>
                    </Box>
                  ))}
                  <Box sx={{ bgcolor: '#f1f5f9', p: 3, borderRadius: '8px', mt: 4 }}>
                    <Box display="flex" justifyContent="space-between"><Typography variant="caption" sx={{ fontWeight: 700 }}>Total Paid</Typography><Typography variant="caption" sx={{ fontWeight: 700, color: '#10b981' }}>₹{sale.total_amount}</Typography></Box>
                    <Box display="flex" justifyContent="space-between"><Typography variant="caption" sx={{ fontWeight: 700 }}>Balance</Typography><Typography variant="caption" sx={{ fontWeight: 700, color: '#10b981' }}>₹0.00</Typography></Box>
                  </Box>
                </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default DigitalMetalSaleDetailPage

