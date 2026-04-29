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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  InputAdornment,
  TablePagination
} from '@mui/material'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'

type MetalMaster = {
  id: number
  metal_name: string
  rate_per: number | null
  rate_per_unit: string | null
  rate_per_display_text: string | null
  rate_from: string
  erp_metal_id: string | null
  group_name: string | null
  display_text: string | null
  booking_amount_percent: number | null
  show_in_dashboard: boolean
  status: string
  created_by: number | null
  creator?: { name: string } | null
  sort_order: number | null
  is_decimal_allow: boolean
}

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const MetalMasterListPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [metals, setMetals] = useState<MetalMaster[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])

  // Search and Pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const [deleteTarget, setDeleteTarget] = useState<MetalMaster | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!accessToken) {
        throw new Error('Missing access token')
      }

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

      if (!response.ok) {
        throw new Error(payload?.message || 'Request failed')
      }

      return payload as T
    },
    [accessToken]
  )

  const loadMetals = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      const payload = await request<{ success: boolean; data: MetalMaster[] }>('/metal-masters')

      if (payload.success) {
        setMetals(payload.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [accessToken, request])

  const loadLogs = useCallback(async () => {
    if (!accessToken) return
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/metal-masters/logs`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })
      const payload = await response.json()
      if (payload.success) {
        setLogs(payload.data)
      }
    } catch (err) {
      console.error('Failed to load logs', err)
    }
  }, [accessToken])

  useEffect(() => {
    if (status === 'authenticated') {
      void loadMetals()
      void loadLogs()
    }
  }, [status, loadMetals, loadLogs])

  const handleDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)

    try {
      await request(`/metal-masters/${deleteTarget.id}`, { method: 'DELETE' })
      setMetals(prev => prev.filter(m => m.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter and Paginate data
  const filteredMetals = metals.filter(metal => 
    metal.metal_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (metal.group_name && metal.group_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (metal.display_text && metal.display_text.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const paginatedMetals = filteredMetals.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <Box>
      <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={6}>
          <Typography variant="h5">Metal Master List</Typography>
          <Button variant="contained" component={Link} href="/metal-rates/master/add" startIcon={<i className="ri-add-line" />}>
            Create Metal
          </Button>
        </Stack>

        <Box mb={4}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search metals..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(0)
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <i className="ri-search-line" />
                </InputAdornment>
              )
            }}
            sx={{ maxWidth: '400px' }}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        <TableContainer sx={{ border: '1px solid #eaeaea', borderRadius: '4px' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Sort Order</TableCell>
                <TableCell>Metal Name</TableCell>
                <TableCell>Group Name</TableCell>
                <TableCell>Display Text</TableCell>
                <TableCell>Booking Amount %</TableCell>
                <TableCell>Rate Per</TableCell>
                <TableCell>Show in Dashboard</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 10 }}>
                    <CircularProgress size={40} />
                  </TableCell>
                </TableRow>
              ) : paginatedMetals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 10 }}>
                    No metal masters found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMetals.map(metal => (
                  <TableRow key={metal.id} hover>
                    <TableCell>{metal.sort_order ?? '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{metal.metal_name}</TableCell>
                    <TableCell>{metal.group_name || '-'}</TableCell>
                    <TableCell>{metal.display_text || '-'}</TableCell>
                    <TableCell>{metal.booking_amount_percent ? `${metal.booking_amount_percent}%` : '-'}</TableCell>
                    <TableCell>
                      {metal.rate_per} / {metal.rate_per_unit}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={metal.show_in_dashboard ? 'Yes' : 'No'}
                        color={metal.show_in_dashboard ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={metal.status || 'Active'}
                        color={metal.status === 'Active' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{metal.creator?.name || '-'}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end" spacing={1}>
                        <IconButton component={Link} href={`/metal-rates/master/${metal.id}`} color="info" size="small">
                          <i className="ri-eye-line" />
                        </IconButton>
                        <IconButton component={Link} href={`/metal-rates/master/${metal.id}/edit`} color="primary" size="small">
                          <i className="ri-edit-2-line" />
                        </IconButton>
                        <IconButton color="error" onClick={() => setDeleteTarget(metal)} size="small">
                          <i className="ri-delete-bin-6-line" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filteredMetals.length}
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

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Metal Master?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteTarget?.metal_name}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={isDeleting}>
            {isDeleting ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global Activity History */}
      <Card sx={{ mt: 8, borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <CardContent sx={{ p: 6 }}>
          <Typography variant="h6" sx={{ mb: 6, color: '#6366f1', fontWeight: 500 }}>
            Recent Activity History
          </Typography>
          <Divider sx={{ mb: 6 }} />
          
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px' }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Updated By</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Metal</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Old Rate</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>New Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      No recent activity found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.created_at).toLocaleString('en-GB')}</TableCell>
                      <TableCell>{log.user?.name || 'System'}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{log.metal_master?.metal_name || '-'}</TableCell>
                      <TableCell>Update</TableCell>
                      <TableCell>{log.old_rate || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: parseFloat(log.new_rate) > parseFloat(log.old_rate || '0') ? 'success.main' : 'error.main' }}>
                        {log.new_rate || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}

export default MetalMasterListPage
