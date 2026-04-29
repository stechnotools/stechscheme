'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Box,
  CircularProgress,
  Divider,
  Chip
} from '@mui/material'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const VoucherSetupListPage = () => {
  const { data: session } = useSession()
  const accessToken = (session as any)?.accessToken

  const [data, setData] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editItem, setEditItem] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const res = await fetch(`${backendApiUrl}/voucher-setup`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
      })
      const json = await res.json()
      setData(json.data || [])
      
      const logRes = await fetch(`${backendApiUrl}/voucher-setup/logs`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
      })
      const logJson = await logRes.json()
      setLogs(logJson.data || [])
    } catch (err) {
      setError('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleEdit = (item: any) => {
    setEditItem({ ...item })
    setOpen(true)
  }

  const handleViewLog = () => {
    setLogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${backendApiUrl}/voucher-setup/${editItem.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          prefix: editItem.prefix,
          start_no: editItem.start_no
        })
      })
      if (res.ok) {
        setOpen(false)
        fetchData()
      } else {
        const json = await res.json()
        const errorMsg = json.errors ? Object.values(json.errors).flat().join(', ') : (json.message || 'Failed to update')
        setError(errorMsg)
      }
    } catch (err) {
      setError('Error saving data: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading && data.length === 0) {
    return <Box display="flex" justifyContent="center" p={10}><CircularProgress /></Box>
  }

  return (
    <Box>
      <Typography variant='h4' sx={{ mb: 6, fontWeight: 600 }}>Voucher Setup</Typography>

      <Card sx={{ borderRadius: '12px', boxShadow: '0 4px 18px 0 rgba(47, 43, 61, 0.1)' }}>
        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', py: 4 }}>Transaction Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Prefix</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Start No.</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Updated By</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Log</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row: any) => (
                <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ py: 4, fontWeight: 500 }}>{row.transaction_type}</TableCell>
                  <TableCell>{row.prefix}</TableCell>
                  <TableCell>{row.start_no}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {row.user?.name || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={() => handleEdit(row)}
                      sx={{ borderRadius: '6px', textTransform: 'none' }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                  <TableCell align="right">
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={handleViewLog}
                      color="secondary"
                      sx={{ borderRadius: '6px', textTransform: 'none' }}
                    >
                      Log
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Edit Voucher Setup</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}
          <Box sx={{ py: 2 }}>
            <Typography variant="subtitle2" color="primary" sx={{ mb: 4 }}>
              Setting up prefix and sequence for: <strong>{editItem?.transaction_type}</strong>
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Prefix"
                  value={editItem?.prefix || ''}
                  onChange={(e) => setEditItem({ ...editItem, prefix: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Number"
                  type="number"
                  value={editItem?.start_no || ''}
                  onChange={(e) => setEditItem({ ...editItem, start_no: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={() => setOpen(false)} color="secondary">Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Log Dialog */}
      <Dialog open={logOpen} onClose={() => setLogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
          <i className="ri-history-line" style={{ marginRight: '8px' }} />
          Recent Activity History
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', py: 3 }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length > 0 ? (
                  logs.map((log: any) => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ py: 3 }}>
                        {new Date(log.created_at).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{log.user?.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={log.action} 
                          size="small" 
                          color={log.action === 'Update' ? 'primary' : 'default'}
                          sx={{ borderRadius: '4px', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>{log.description}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      No recent activity found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={() => setLogOpen(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default VoucherSetupListPage
