'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  Card,
  CardContent,
  Typography,
  Grid,
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
  Chip,
  Stack,
  InputAdornment,
  IconButton,
  TableContainer,
  Table
} from '@mui/material'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const VoucherSetupListPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as any)?.accessToken

  const [data, setData] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(status === 'loading')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [view, setView] = useState<'list' | 'form'>('list')
  const [search, setSearch] = useState('')
  const [logOpen, setLogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState<any>({
    id: null,
    transaction_type: '',
    prefix: '',
    start_no: 1
  })

  const fetchData = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
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
      setError('Failed to fetch voucher setup configurations.')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData()
    }
  }, [status, fetchData])

  const handleEdit = (item: any) => {
    setError(null)
    setSuccess(null)
    setFormData({
      id: item.id,
      transaction_type: item.transaction_type,
      prefix: item.prefix || '',
      start_no: item.start_no
    })
    setView('form')
  }

  const handleNew = () => {
    setError(null)
    setSuccess(null)
    setFormData({
      id: null,
      transaction_type: '',
      prefix: '',
      start_no: 1
    })
    setView('form')
  }

  const handleSave = async () => {
    if (!formData.transaction_type) {
      setError('Please enter a transaction type')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const isEdit = formData.id
      const url = isEdit ? `${backendApiUrl}/voucher-setup/${formData.id}` : `${backendApiUrl}/voucher-setup`
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          transaction_type: formData.transaction_type,
          prefix: formData.prefix,
          start_no: formData.start_no
        })
      })

      if (res.ok) {
        setSuccess(`Voucher setup ${isEdit ? 'updated' : 'created'} successfully.`)
        await fetchData()
        setView('list')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const json = await res.json()
        const errorMsg = json.errors 
          ? Object.values(json.errors).flat().join(', ') 
          : (json.message || 'Failed to save voucher setup')
        setError(errorMsg)
      }
    } catch (err: any) {
      setError('Error saving voucher setup: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id?: number) => {
    if (!id) return
    if (!confirm('Are you sure you want to delete this voucher setup configuration?')) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`${backendApiUrl}/voucher-setup/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        }
      })

      if (res.ok) {
        setSuccess('Voucher setup deleted successfully.')
        await fetchData()
        setView('list')
        setFormData({ id: null, transaction_type: '', prefix: '', start_no: 1 })
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const json = await res.json()
        setError(json.message || 'Failed to delete voucher setup')
      }
    } catch (err: any) {
      setError('Error deleting voucher setup: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredData = useMemo(() => {
    if (!search) return data
    const query = search.toLowerCase()
    return data.filter(row => 
      row.transaction_type?.toLowerCase().includes(query) ||
      row.prefix?.toLowerCase().includes(query) ||
      String(row.start_no).includes(query) ||
      row.user?.name?.toLowerCase().includes(query)
    )
  }, [data, search])

  if (loading && data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ bgcolor: 'white', minHeight: '100vh', p: 4 }}>
      {/* Top Action Bar */}
      <Card sx={{ mb: 6, borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
        <Stack direction='row' spacing={1} sx={{ p: 1.5, bgcolor: 'grey.50' }} alignItems="center">
          <Button 
            size='small' 
            startIcon={<i className='ri-list-check' />} 
            onClick={() => setView('list')}
            sx={{ fontWeight: 600, color: view === 'list' ? 'primary.main' : 'text.primary' }}
          >
            List
          </Button>
          <Button 
            size='small' 
            startIcon={<i className='ri-save-line' />} 
            onClick={handleSave} 
            disabled={saving || view === 'list'}
            sx={{ fontWeight: 600, color: view === 'form' ? 'primary.main' : 'text.disabled' }}
          >
            Save
          </Button>
          <Button 
            size='small' 
            startIcon={<i className='ri-add-line' />} 
            onClick={handleNew}
            sx={{ fontWeight: 600 }}
          >
            New
          </Button>
          <Button 
            size='small' 
            startIcon={<i className='ri-delete-bin-line' />} 
            onClick={() => formData.id && handleDelete(formData.id)}
            disabled={!formData.id || view === 'list' || saving}
            color='error'
            sx={{ fontWeight: 600 }}
          >
            Delete
          </Button>
          <Divider orientation='vertical' flexItem sx={{ mx: 1 }} />
          <Button 
            size='small' 
            startIcon={<i className='ri-history-line' />} 
            onClick={() => setLogOpen(true)} 
            sx={{ fontWeight: 600 }}
          >
            Logs
          </Button>
          <Button 
            size='small' 
            startIcon={<i className='ri-refresh-line' />} 
            onClick={fetchData} 
            sx={{ fontWeight: 600 }}
          >
            Refresh
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          {view === 'list' && (
            <TextField
              size='small'
              placeholder='Search setups...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ width: 220, '& .MuiInputBase-root': { height: 32, fontSize: '0.875rem', bgcolor: 'white' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='ri-search-line' />
                  </InputAdornment>
                )
              }}
            />
          )}
        </Stack>
      </Card>

      {/* Header and Title */}
      <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 6 }}>
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          {view === 'form' 
            ? (formData.id ? `Edit: ${formData.transaction_type}` : 'New Voucher Setup') 
            : 'Voucher Setup Master'}
        </Typography>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 4 }}>{success}</Alert>}

      {/* Content Area */}
      {view === 'list' ? (
        <Card variant="outlined" sx={{ borderRadius: 1 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem' }}>Sl. No.</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem' }}>Transaction Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem' }}>Prefix</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem' }}>Start No.</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem' }}>Last Updated By</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                      No voucher setup configurations found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row: any, index: number) => (
                    <tr 
                      key={row.id} 
                      onDoubleClick={() => handleEdit(row)}
                      style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{index + 1}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500, color: '#2563eb' }}>
                        {row.transaction_type}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{row.prefix || '-'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{row.start_no}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {row.user?.name || 'System'}
                        </Typography>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <IconButton size="small" color="primary" onClick={() => handleEdit(row)}>
                            <i className="ri-pencil-line" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
                            <i className="ri-delete-bin-line" />
                          </IconButton>
                        </Stack>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Box>
        </Card>
      ) : (
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card variant="outlined" sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <CardContent sx={{ p: 6 }}>
                <Stack spacing={6}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                    <Box sx={{ p: 1.5, bgcolor: 'primary.lighter', borderRadius: 1.5, color: 'primary.main' }}>
                      <i className="ri-settings-5-line" style={{ fontSize: '1.25rem' }} />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700}>Setup Details</Typography>
                  </Stack>

                  <TextField
                    select
                    fullWidth
                    label="Transaction Type"
                    value={formData.transaction_type}
                    onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                    disabled={!!formData.id}
                    required
                    SelectProps={{ native: true }}
                    helperText={formData.id ? "Transaction type cannot be modified for existing setups." : "Select a transaction type from the system list."}
                  >
                    <option value="" disabled>-- Select Transaction Type --</option>
                    <option value="Loyalty Card Redemption">Loyalty Point Add/Redeem (Loyalty Card Redemption)</option>
                    <option value="Digital Sale">Digital Metal Sale Entry (Digital Sale)</option>
                    <option value="Digital Purchase">Digital Metal Purchase Entry (Digital Purchase)</option>
                    <option value="Digital Gold Buy">Digital Gold Buy</option>
                    <option value="Digital Gold Sell">Digital Gold Sell</option>
                    <option value="Digital Gold Lease">Digital Gold Lease</option>
                  </TextField>

                  <Grid container spacing={4}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Voucher Prefix"
                        placeholder="e.g. LC"
                        value={formData.prefix}
                        onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Start Number"
                        type="number"
                        value={formData.start_no}
                        onChange={(e) => setFormData({ ...formData, start_no: parseInt(e.target.value) || 1 })}
                        required
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Stack direction="row" spacing={3} justifyContent="flex-start" alignItems="center">
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<i className="ri-save-line" />}
                      onClick={handleSave}
                      disabled={saving}
                      sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '6px' }}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    
                    {formData.id && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<i className="ri-delete-bin-line" />}
                        onClick={() => handleDelete(formData.id)}
                        disabled={saving}
                        sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '6px' }}
                      >
                        Delete Setup
                      </Button>
                    )}

                    <Button
                      variant="text"
                      color="secondary"
                      startIcon={<i className="ri-arrow-left-line" />}
                      onClick={() => setView('list')}
                      sx={{ fontWeight: 600, textTransform: 'none', marginLeft: 'auto !important' }}
                    >
                      Back to List
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'grey.50' }}>
              <CardContent sx={{ p: 5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Live Preview</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 4 }}>
                  This prefix and number sequence will be used to automatically format newly generated transactions.
                </Typography>
                <Divider sx={{ my: 3 }} />
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption">Formatted Sample</Typography>
                    <Typography variant="caption" fontWeight={700} color="primary.main">
                      {formData.prefix ? `${formData.prefix} ${formData.start_no}` : formData.start_no}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="caption">Next Sequence</Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {formData.prefix ? `${formData.prefix} ${formData.start_no + 1}` : formData.start_no + 1}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Log Activity Dialog */}
      <Dialog open={logOpen} onClose={() => setLogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <i className="ri-history-line" />
            <Typography variant="h6">Voucher Setup Activity History</Typography>
          </Stack>
          <IconButton onClick={() => setLogOpen(false)} size="small">
            <i className="ri-close-line" />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem' }}>Date & Time</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem' }}>User</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem' }}>Action</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '0.85rem' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log: any) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px 16px', fontSize: '0.8rem' }}>
                        {new Date(log.created_at).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 600 }}>{log.user?.name || 'System'}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <Chip 
                          label={log.action} 
                          size="small" 
                          color={log.action === 'Create' ? 'success' : log.action === 'Update' ? 'info' : 'error'}
                          sx={{ borderRadius: '4px', fontWeight: 600, height: 20, fontSize: '0.75rem' }}
                        />
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '0.8rem' }}>{log.description}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} align="center" style={{ padding: '24px', color: '#64748b' }}>
                      No recent activity logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </TableContainer>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={() => setLogOpen(false)} variant="contained" size="small">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default VoucherSetupListPage

