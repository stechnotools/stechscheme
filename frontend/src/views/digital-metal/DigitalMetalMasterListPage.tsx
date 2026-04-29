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
  TablePagination,
  Breadcrumbs
} from '@mui/material'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'

type DigitalMetalMaster = {
  id: number
  metal_name: string
  erp_metal_id: string | null
  display_text: string | null
  purity: string | null
  rate_per: string | null
  rate_per_display_text: string | null
  status: string
  updated_by?: string | null
  updated_at?: string | null
}

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const DigitalMetalMasterListPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const [metals, setMetals] = useState<DigitalMetalMaster[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])

  // Search and Pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const [deleteTarget, setDeleteTarget] = useState<DigitalMetalMaster | null>(null)
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
      const payload = await request<{ success: boolean; data: DigitalMetalMaster[] }>('/digital-metal-masters')

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
      const response = await fetch(`${resolveBackendApiUrl()}/digital-metal-masters/logs`, {
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
      await request(`/digital-metal-masters/${deleteTarget.id}`, { method: 'DELETE' })
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
    (metal.display_text && metal.display_text.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (metal.erp_metal_id && metal.erp_metal_id.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const paginatedMetals = filteredMetals.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

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
            <Typography color="text.primary">Digital Metal Master</Typography>
          </Breadcrumbs>
        </Box>
        <Stack direction="row" spacing={4}>
          <Button 
            variant="contained" 
            component={Link} 
            href="/digital-metal/master/add" 
            startIcon={<i className="ri-add-line" />}
            sx={{ 
              backgroundColor: '#6366f1', 
              '&:hover': { backgroundColor: '#4f46e5' },
              textTransform: 'none',
              fontSize: '1rem',
              px: 4
            }}
          >
            Create Digital Metal
          </Button>
          <Button 
            variant="contained" 
            component={Link} 
            href="/digital-metal/rates" 
            sx={{ 
              backgroundColor: '#17a2b8', 
              '&:hover': { backgroundColor: '#138496' },
              textTransform: 'none',
              fontSize: '1rem',
              px: 4
            }}
          >
            Digital Metal Rate
          </Button>
        </Stack>
      </Stack>

      <Card sx={{ borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <CardContent sx={{ p: 6 }}>
          <Typography variant="h6" sx={{ mb: 6, color: '#8b5cf6', fontWeight: 500 }}>
            Digital Metal Master List
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 4 }}>
              {error}
            </Alert>
          )}

          <TableContainer sx={{ border: '1px solid #eaeaea', borderRadius: '4px' }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f3f4ff' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Metal Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>ERP Metal Id</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Display Text</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Purity</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Rate Per</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Rate Per Display Text</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Updated By</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                      <CircularProgress size={40} />
                    </TableCell>
                  </TableRow>
                ) : paginatedMetals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                      No digital metal masters found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMetals.map(metal => (
                    <TableRow key={metal.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{metal.metal_name}</TableCell>
                      <TableCell>{metal.erp_metal_id || '-'}</TableCell>
                      <TableCell>{metal.display_text || '-'}</TableCell>
                      <TableCell>{metal.purity || '-'}</TableCell>
                      <TableCell>{metal.rate_per || '-'}</TableCell>
                      <TableCell>{metal.rate_per_display_text || '-'}</TableCell>
                      <TableCell>
                        <Typography color={metal.status === 'Active' ? 'text.primary' : 'text.secondary'}>
                          {metal.status}
                        </Typography>
                      </TableCell>
                      <TableCell>{metal.updated_by || '-'}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" justifyContent="center" spacing={1}>
                          <IconButton 
                            size="small" 
                            component={Link} 
                            href={`/digital-metal/master/${metal.id}/edit`}
                            title="Edit"
                            sx={{ color: '#7367F0' }}
                          >
                            <i className="ri-edit-box-line" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            component={Link} 
                            href={`/digital-metal/master/${metal.id}`}
                            title="Detail"
                            sx={{ color: '#00cfe8' }}
                          >
                            <i className="ri-eye-line" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => setDeleteTarget(metal)}
                            title="Delete"
                            sx={{ color: '#ea5455' }}
                          >
                            <i className="ri-delete-bin-7-line" />
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
        <DialogTitle>Delete Digital Metal Master?</DialogTitle>
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
                  <TableCell sx={{ fontWeight: 'bold' }}>Old Markup (B/S)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>New Markup (B/S)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      No recent activity found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.created_at).toLocaleString('en-GB')}</TableCell>
                      <TableCell>{log.user?.name || 'System'}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{log.digital_metal_master?.metal_name || '-'}</TableCell>
                      <TableCell>Update</TableCell>
                      <TableCell>{log.old_rate || '-'}</TableCell>
                      <TableCell sx={{ 
                        color: parseFloat(log.new_rate) > parseFloat(log.old_rate || '0') 
                          ? 'success.main' 
                          : parseFloat(log.new_rate) < parseFloat(log.old_rate || '0') 
                            ? 'error.main' 
                            : 'text.primary',
                        fontWeight: parseFloat(log.new_rate) !== parseFloat(log.old_rate || '0') ? 'bold' : 'normal'
                      }}>
                        {log.new_rate || '-'}
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
    </Box>
  )
}

export default DigitalMetalMasterListPage
