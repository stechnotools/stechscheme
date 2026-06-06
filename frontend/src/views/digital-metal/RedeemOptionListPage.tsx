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
  TextField,
  Alert,
  Box,
  Stack,
  CircularProgress,
  Chip,
  MenuItem,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Breadcrumbs,
  Link
} from '@mui/material'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const RedeemOptionListPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as any)?.accessToken

  const [data, setData] = useState([])
  const [metals, setMetals] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(status === 'loading')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [showLogs, setShowLogs] = useState(true)
  
  // Filter states
  const [filterMetal, setFilterMetal] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  
  const initialFormState = {
    id: null,
    digital_metal_master_id: '',
    option_name: '',
    display_text: '',
    option_value: '',
    status: 'Active'
  }
  
  const [form, setForm] = useState(initialFormState)
  
  const fetchData = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const [optionsRes, metalsRes, logsRes] = await Promise.all([
        fetch(`${backendApiUrl}/metal-redeem-options`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
        }),
        fetch(`${backendApiUrl}/digital-metal-masters`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
        }),
        fetch(`${backendApiUrl}/activity-logs?sub_module=Redeem Options`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
        })
      ])
      
      const optionsJson = await optionsRes.json()
      const metalsJson = await metalsRes.json()
      const logsJson = await logsRes.json()
      
      setData(optionsJson.data || [])
      setMetals(metalsJson.data || [])
      setLogs(logsJson.data || [])
    } catch (err) {
      setError('Failed to fetch data')
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
    setForm({
      id: item.id,
      digital_metal_master_id: item.digital_metal_master_id,
      option_name: item.option_name,
      display_text: item.display_text || '',
      option_value: item.option_value,
      status: item.status
    })
    setOpenForm(true)
  }

  const handleClose = () => {
    setForm(initialFormState)
    setOpenForm(false)
    setError(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this option?')) return
    try {
      const res = await fetch(`${backendApiUrl}/metal-redeem-options/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
      })
      if (res.ok) fetchData()
    } catch (err) {
      setError('Failed to delete')
    }
  }

  const handleSave = async () => {
    if (!form.digital_metal_master_id || !form.option_name || !form.option_value) {
      setError('Please fill all required fields')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const method = form.id ? 'PUT' : 'POST'
      const url = form.id 
        ? `${backendApiUrl}/metal-redeem-options/${form.id}` 
        : `${backendApiUrl}/metal-redeem-options`

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(form)
      })

      if (res.ok) {
        handleClose()
        fetchData()
      } else {
        const json = await res.json()
        const errorMsg = json.errors ? Object.values(json.errors).flat().join(', ') : (json.message || 'Failed to save')
        setError(errorMsg)
      }
    } catch (err) {
      setError('Error saving data')
    } finally {
      setSaving(false)
    }
  }

  const filteredData = data.filter((item: any) => {
    const matchMetal = filterMetal === 'All' || item.digital_metal_master_id === filterMetal
    const matchStatus = filterStatus === 'All' || item.status === filterStatus
    return matchMetal && matchStatus
  })

  const selectedMetal: any = metals.find((m: any) => m.id === form.digital_metal_master_id)

  if (loading && data.length === 0) {
    return <Box display="flex" justifyContent="center" p={10}><CircularProgress /></Box>
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Breadcrumbs */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <Link href="/" color="inherit" sx={{ display: 'flex', alignItems: 'center' }}>
          <i className="ri-home-fill" style={{ fontSize: '20px', color: '#6366f1' }} />
        </Link>
        <Typography sx={{ mx: 2, color: 'text.secondary' }}>/</Typography>
        <Typography sx={{ fontWeight: 500 }}>Digital Metal Redeem Weight Option</Typography>
      </Box>

      {/* Filter Card */}
      <Card sx={{ mb: 6, borderRadius: '8px', boxShadow: '0 2px 10px 0 rgba(0,0,0,0.05)' }}>
        <CardContent sx={{ py: 6 }}>
          <Grid container spacing={6} alignItems="flex-end">
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>Metal</Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={filterMetal}
                onChange={(e) => setFilterMetal(e.target.value)}
              >
                <MenuItem value="All">All</MenuItem>
                {metals.map((metal: any) => (
                  <MenuItem key={metal.id} value={metal.id}>{metal.metal_name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>Status</Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Button 
                variant="outlined" 
                fullWidth 
                sx={{ py: 2, color: '#6366f1', borderColor: '#6366f1', textTransform: 'none' }}
                onClick={() => fetchData()}
              >
                Search
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* List Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='h6' sx={{ fontWeight: 600, color: '#8c57ff' }}>Metal Default Redeem Option List</Typography>
        <Box display="flex" alignItems="center" gap={4}>
          <Chip label={`Total Count : ${filteredData.length}`} sx={{ fontWeight: 600, borderRadius: '4px', backgroundColor: '#f0f0f0' }} />
          <Button 
            variant="contained" 
            size="small"
            startIcon={<i className="ri-add-line" />}
            onClick={() => setOpenForm(true)}
            sx={{ backgroundColor: '#6366f1', textTransform: 'none' }}
          >
            Create Option
          </Button>
        </Box>
      </Box>

      {/* List Table Card */}
      <Card sx={{ mb: 8, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 10px 0 rgba(0,0,0,0.05)' }}>
        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ backgroundColor: '#eeecff' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', py: 3 }}>Metal Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Purity</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Option Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Display Text</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Option Value</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Created By</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 10, color: 'text.secondary' }}>No records found</TableCell>
                </TableRow>
              ) : (
                filteredData.map((row: any) => (
                  <TableRow key={row.id} hover sx={{ '&:nth-of-type(even)': { backgroundColor: '#f9f9f9' } }}>
                    <TableCell sx={{ py: 3 }}>{row.digital_metal_master?.metal_name}</TableCell>
                    <TableCell>{row.digital_metal_master?.purity}</TableCell>
                    <TableCell>{row.option_name}</TableCell>
                    <TableCell>{row.display_text || '-'}</TableCell>
                    <TableCell>{row.option_value ? parseFloat(row.option_value).toFixed(3) : '0.000'}</TableCell>
                    <TableCell>
                      <Typography sx={{ color: row.status === 'Active' ? 'success.main' : 'error.main', fontWeight: 500 }}>
                        {row.status}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.creator?.name || '-'}</TableCell>
                    <TableCell align="center">
                      <Box display="flex" justifyContent="center" gap={2}>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          onClick={() => handleEdit(row)}
                          sx={{ borderColor: '#2196f3', color: '#2196f3', minWidth: '60px', textTransform: 'none' }}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          color="error" 
                          onClick={() => handleDelete(row.id)}
                          sx={{ minWidth: '60px', textTransform: 'none' }}
                        >
                          Delete
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Form Dialog - Styled to match screenshot */}
      <Dialog open={openForm} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '8px', p: 2 } }}>
        <DialogTitle sx={{ pb: 4 }}>
          <Typography component="span" variant="h5" sx={{ fontWeight: 500, color: '#8c57ff' }}>
            Digital Metal Redeem Weight Option {form.id ? 'Update' : 'Setup'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ borderTop: '1px solid #f0f0f0', pt: 6 }}>
          {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}
          <Grid container spacing={8}>
            {/* Column 1 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={6}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography sx={{ fontWeight: 600, minWidth: '120px' }}>Metal Name</Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    variant="standard"
                    value={form.digital_metal_master_id}
                    onChange={(e) => setForm({ ...form, digital_metal_master_id: e.target.value })}
                  >
                    {metals.map((metal: any) => (
                      <MenuItem key={metal.id} value={metal.id}>
                        {metal.metal_name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography sx={{ fontWeight: 600, minWidth: '120px' }}>Option Name</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    variant="standard"
                    placeholder="e.g. 1 gm"
                    value={form.option_name}
                    onChange={(e) => setForm({ ...form, option_name: e.target.value })}
                  />
                </Box>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography sx={{ fontWeight: 600, minWidth: '120px' }}>Display Text</Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    sx={{ backgroundColor: '#f0f2f5', borderRadius: '4px', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
                    value={form.display_text}
                    onChange={(e) => setForm({ ...form, display_text: e.target.value })}
                  >
                    <MenuItem value="">-- Select --</MenuItem>
                    {metals.map((m: any) => (
                      <MenuItem key={m.id} value={`${m.purity} ${m.metal_name}`}>{m.purity} {m.metal_name}</MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Stack>
            </Grid>

            {/* Column 2 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={6}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography sx={{ fontWeight: 600, minWidth: '120px' }}>Status</Typography>
                  <Box display="flex" alignItems="center" width="100%">
                    <Switch 
                      checked={form.status === 'Active'}
                      onChange={(e) => setForm({ ...form, status: e.target.checked ? 'Active' : 'Inactive' })}
                      color="primary"
                    />
                    <Typography sx={{ ml: 1 }}>{form.status}</Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography sx={{ fontWeight: 600, minWidth: '120px' }}>Purity</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    variant="standard"
                    disabled
                    value={selectedMetal?.purity || ''}
                  />
                </Box>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography sx={{ fontWeight: 600, minWidth: '120px' }}>Option Value</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={form.option_value}
                    onChange={(e) => setForm({ ...form, option_value: e.target.value })}
                    inputProps={{ step: '0.001' }}
                    sx={{ border: '1px solid #dcdfe6', borderRadius: '4px', px: 1 }}
                  />
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 4, justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', mt: 4 }}>
          <Button 
            onClick={handleClose}
            variant="outlined"
            sx={{ borderColor: '#2196f3', color: '#2196f3', textTransform: 'none', px: 6 }}
          >
            Back
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleSave} 
            disabled={saving}
            sx={{ borderColor: '#4caf50', color: '#4caf50', textTransform: 'none', px: 6 }}
          >
            {saving ? 'Saving...' : (form.id ? 'Update' : 'Save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Activity Log Section */}
      <Card sx={{ borderRadius: '4px', border: '1px solid #e0e0e0' }}>
        <Box sx={{ p: 3, backgroundColor: '#5c677d', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ color: 'inherit', fontWeight: 500 }}>Activity Log</Typography>
          <Box display="flex" gap={2}>
            <IconButton size="small" sx={{ color: 'white' }} onClick={fetchData}>
              <i className="ri-refresh-line" />
            </IconButton>
            <IconButton size="small" sx={{ color: 'white' }} onClick={() => setShowLogs(!showLogs)}>
              <i className={showLogs ? "ri-subtract-line" : "ri-add-line"} />
            </IconButton>
          </Box>
        </Box>
        {showLogs && (
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No recent activity found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.created_at).toLocaleString('en-GB')}</TableCell>
                        <TableCell>{log.user?.name || 'System'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={log.action} 
                            size="small" 
                            color={log.action === 'Create' ? 'success' : log.action === 'Update' ? 'info' : 'error'} 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{log.description}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}
      </Card>
    </Box>
  )
}

export default RedeemOptionListPage

