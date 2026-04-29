'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Card,
  CardContent,
  CardHeader,
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
  CircularProgress,
  Chip,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const BuyingOptionListPage = () => {
  const { data: session } = useSession()
  const accessToken = (session as any)?.accessToken

  const [data, setData] = useState([])
  const [metals, setMetals] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [showLogs, setShowLogs] = useState(true)
  
  const initialFormState = {
    id: null,
    digital_metal_master_id: '',
    option_name: '',
    display_text: '',
    option_value: '',
    status: 'Active'
  }
  
  const [form, setForm] = useState(initialFormState)
  
  // Get unique display texts from metals
  const dynamicDisplayTexts = Array.from(new Set(metals.map((m: any) => m.display_text).filter(Boolean)))
  
  useEffect(() => {
    if (form.digital_metal_master_id && !form.id) {
      const metal = metals.find((m: any) => m.id === form.digital_metal_master_id)
      if (metal) {
        setForm(prev => ({ ...prev, display_text: (metal as any).display_text || '' }))
      }
    }
  }, [form.digital_metal_master_id, metals, form.id])

  const fetchData = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const [optionsRes, metalsRes, logsRes] = await Promise.all([
        fetch(`${backendApiUrl}/metal-buying-options`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
        }),
        fetch(`${backendApiUrl}/digital-metal-masters`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
        }),
        fetch(`${backendApiUrl}/activity-logs?sub_module=Buying Options`, {
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
    fetchData()
  }, [fetchData])

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
      const res = await fetch(`${backendApiUrl}/metal-buying-options/${id}`, {
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
        ? `${backendApiUrl}/metal-buying-options/${form.id}` 
        : `${backendApiUrl}/metal-buying-options`

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

  const selectedMetal = metals.find((m: any) => m.id === form.digital_metal_master_id)

  if (loading && data.length === 0) {
    return <Box display="flex" justifyContent="center" p={10}><CircularProgress /></Box>
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#6366f1' }}>
          Popular Buying Options
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<i className="ri-add-line" />}
          onClick={() => setOpenForm(true)}
          sx={{ backgroundColor: '#6366f1', textTransform: 'none' }}
        >
          Create Option
        </Button>
      </Box>

      {/* Form Dialog */}
      <Dialog open={openForm} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Digital Metal Popular Buying Option {form.id ? 'Update' : 'Setup'}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}
          <Grid container spacing={6} sx={{ mt: 1 }}>
            {/* Left Column */}
            <Grid item xs={12} md={6}>
              <Grid container alignItems="center" spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={4}>
                  <Typography sx={{ fontWeight: 600 }}>Metal Name</Typography>
                </Grid>
                <Grid item xs={8}>
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
                </Grid>
              </Grid>

              <Grid container alignItems="center" spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={4}>
                  <Typography sx={{ fontWeight: 600 }}>Option Name</Typography>
                </Grid>
                <Grid item xs={8}>
                  <TextField
                    fullWidth
                    size="small"
                    variant="standard"
                    placeholder="e.g. 100 gm"
                    value={form.option_name}
                    onChange={(e) => setForm({ ...form, option_name: e.target.value })}
                    inputProps={{ list: 'option-names' }}
                  />
                  <datalist id="option-names">
                    <option value="1 gm" />
                    <option value="5 gm" />
                    <option value="10 gm" />
                    <option value="50 gm" />
                    <option value="100 gm" />
                    <option value="500 gm" />
                    <option value="1 kg" />
                  </datalist>
                </Grid>
              </Grid>

              <Grid container alignItems="center" spacing={2}>
                <Grid item xs={4}>
                  <Typography sx={{ fontWeight: 600 }}>Display Text</Typography>
                </Grid>
                <Grid item xs={8}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={form.display_text}
                    onChange={(e) => setForm({ ...form, display_text: e.target.value })}
                    sx={{ backgroundColor: '#f0f2f5', borderRadius: '4px' }}
                  >
                    <MenuItem value="">Select Display Text</MenuItem>
                    {dynamicDisplayTexts.map((text: any) => (
                      <MenuItem key={text} value={text}>{text}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Grid>

            {/* Right Column */}
            <Grid item xs={12} md={6}>
              <Grid container alignItems="center" spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={4}>
                  <Typography sx={{ fontWeight: 600 }}>Status</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Box display="flex" alignItems="center">
                    <Switch 
                      checked={form.status === 'Active'}
                      onChange={(e) => setForm({ ...form, status: e.target.checked ? 'Active' : 'Inactive' })}
                      color="primary"
                    />
                    <Typography variant="body2" sx={{ ml: 2, fontWeight: 600 }}>
                      {form.status}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Grid container alignItems="center" spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={4}>
                  <Typography sx={{ fontWeight: 600 }}>Purity</Typography>
                </Grid>
                <Grid item xs={8}>
                  <TextField
                    fullWidth
                    size="small"
                    variant="standard"
                    disabled
                    value={(selectedMetal as any)?.purity || ''}
                    placeholder="Auto-fetched"
                  />
                </Grid>
              </Grid>

              <Grid container alignItems="center" spacing={2}>
                <Grid item xs={4}>
                  <Typography sx={{ fontWeight: 600 }}>Option Value</Typography>
                </Grid>
                <Grid item xs={8}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={form.option_value}
                    onChange={(e) => setForm({ ...form, option_value: e.target.value })}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) {
                        setForm({ ...form, option_value: val.toFixed(2) })
                      }
                    }}
                    inputProps={{ step: '0.01' }}
                    sx={{ backgroundColor: 'white' }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="outlined" onClick={handleClose} sx={{ px: 8 }}>
            Back
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleSave} 
            sx={{ px: 8, backgroundColor: '#e8f5e9', color: '#2e7d32', '&:hover': { backgroundColor: '#c8e6c9' } }}
            disabled={saving}
          >
            {saving ? 'Updating...' : form.id ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* List Table Card */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant='h5' sx={{ fontWeight: 600 }}>Metal Default Option List</Typography>
        <Chip label={`Total Count : ${data.length}`} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
      </Box>

      <Card sx={{ mb: 8, borderRadius: '12px', boxShadow: '0 4px 18px 0 rgba(47, 43, 61, 0.1)' }}>
        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', py: 4 }}>Metal Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Purity</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Option Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Option Value</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Created By</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Updated By</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row: any) => (
                <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ py: 4, fontWeight: 500 }}>{row.digital_metal_master?.metal_name}</TableCell>
                  <TableCell>{row.digital_metal_master?.purity}</TableCell>
                  <TableCell>{row.option_name}</TableCell>
                  <TableCell>{row.option_value ? parseFloat(row.option_value).toFixed(2) : '0.00'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={row.status} 
                      size="small" 
                      color={row.status === 'Active' ? 'success' : 'error'}
                      sx={{ borderRadius: '4px', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>{row.creator?.name || '-'}</TableCell>
                  <TableCell>{row.updator?.name || '-'}</TableCell>
                  <TableCell align="right">
                    <Box display="flex" justifyContent="flex-end" gap={2}>
                      <Button variant="outlined" size="small" onClick={() => handleEdit(row)}>Edit</Button>
                      <Button variant="outlined" size="small" color="error" onClick={() => handleDelete(row.id)}>Delete</Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

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

export default BuyingOptionListPage
