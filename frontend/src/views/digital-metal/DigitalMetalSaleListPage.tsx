'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
  TablePagination
} from '@mui/material'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const DigitalMetalSaleListPage = () => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const loadSales = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${resolveBackendApiUrl()}/digital-metal-sales`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })
      const payload = await response.json()

      if (payload.success) {
        setSales(payload.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    void loadSales()
  }, [loadSales])

  const filteredSales = sales.filter(sale => 
    sale.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.digital_metal_master?.metal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedSales = filteredSales.slice(page * rowsPerPage, (page + 1) * rowsPerPage)

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#6366f1' }}>
            DigiMetal Sale Entry
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            View and manage digital metal sales
          </Typography>
        </Box>
        <Button
          variant="contained"
          component={Link}
          href="/digital-metal/sales/add"
          startIcon={<i className="ri-add-line" />}
          sx={{ backgroundColor: '#7367F0', '&:hover': { backgroundColor: '#5e54d6' }, textTransform: 'none', px: 6 }}
        >
          New Sale Entry
        </Button>
      </Stack>

      <Card sx={{ borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <CardContent sx={{ p: 6 }}>
          <Grid container spacing={4} alignItems="center" mb={6}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by customer, metal or transaction..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <i className="ri-search-line" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
          </Grid>

          {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

          <TableContainer sx={{ border: '1px solid #eaeaea', borderRadius: '4px' }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f3f4ff' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Metal</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Weight</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Rate/gm</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Amount</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Payment</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                      <CircularProgress size={40} />
                    </TableCell>
                  </TableRow>
                ) : paginatedSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                      No sale entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSales.map((sale) => (
                    <TableRow key={sale.id} hover>
                      <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{sale.customer?.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{sale.customer?.mobile}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{sale.digital_metal_master?.metal_name} ({sale.digital_metal_master?.purity})</TableCell>
                      <TableCell align="right">{sale.weight} gm</TableCell>
                      <TableCell align="right">{sale.rate_per_gm}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>₹{sale.total_amount}</TableCell>
                      <TableCell align="center">
                        <Chip label={sale.payment_mode || 'Cash'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={sale.status} 
                          color={sale.status === 'Completed' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" component={Link} href={`/digital-metal/sales/${sale.id}`} title="View Details">
                          <i className="ri-eye-line" style={{ color: '#00cfe8' }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredSales.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10))
              setPage(0)
            }}
          />
        </CardContent>
      </Card>
    </Box>
  )
}

export default DigitalMetalSaleListPage
