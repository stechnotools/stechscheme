'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Stack,
  Box,
  Alert,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper
} from '@mui/material'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

type MetalMaster = {
  id: number
  metal_name: string
  group_name: string | null
  display_text: string | null
  rate_from: string
  rate_per: number | null
  rate_per_unit: string | null
  status: string
  creator?: { name: string } | null
  last_rate_log?: {
    user?: { name: string } | null
    created_at: string
  } | null
}

type MetalRateLog = {
  id: number
  old_rate: string | null
  new_rate: string
  created_at: string
  user?: { name: string } | null
}

const MetalRateListPage = () => {
  const router = useRouter()
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [metals, setMetals] = useState<MetalMaster[]>([])
  const [newRates, setNewRates] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  // Logs state
  const [selectedMetal, setSelectedMetal] = useState<MetalMaster | null>(null)
  const [logs, setLogs] = useState<MetalRateLog[]>([])
  const [allLogs, setAllLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const fetchMetals = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/metal-masters`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Failed to fetch metals')
      
      const data = payload.data || []
      setMetals(data)
      
      // Initialize new rates with latest rates from logs or master
      const rates: Record<number, string> = {}
      data.forEach((m: MetalMaster) => {
        const currentRate = m.last_rate_log ? m.last_rate_log.new_rate : (m.rate_per ? m.rate_per.toString() : '')
        rates[m.id] = currentRate
      })
      setNewRates(rates)

      // Get the latest update time from all metals
      let latestTime = new Date(0)
      data.forEach((m: MetalMaster) => {
        if (m.last_rate_log) {
          const logTime = new Date(m.last_rate_log.created_at)
          if (logTime > latestTime) latestTime = logTime
        }
      })
      
      if (latestTime.getTime() > 0) {
        setLastUpdate(`${latestTime.toLocaleDateString('en-GB')}, ${latestTime.getHours()}:${String(latestTime.getMinutes()).padStart(2, '0')}`)
      } else {
        const now = new Date()
        setLastUpdate(`${now.toLocaleDateString('en-GB')}, ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading metal rates')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  const fetchAllLogs = useCallback(async () => {
    if (!accessToken) return
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/metal-masters/logs`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })
      const payload = await response.json()
      if (response.ok) {
        setAllLogs(payload.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch all logs', err)
    }
  }, [accessToken])

  useEffect(() => {
    if (accessToken) {
        void fetchMetals()
        void fetchAllLogs()
    }
  }, [accessToken, fetchMetals, fetchAllLogs])

  const handleRateChange = (id: number, value: string) => {
    setNewRates(prev => ({ ...prev, [id]: value }))
  }

  const handleSave = async () => {
    if (!accessToken) return
    setSaving(true)
    setError(null)

    try {
      // Prepare rates to update
      const ratesToUpdate = Object.entries(newRates)
        .map(([id, rate]) => ({ id: parseInt(id), rate_per: rate || null }))
        .filter(item => {
          const metal = metals.find(m => m.id === item.id)
          const currentRate = metal?.last_rate_log ? metal.last_rate_log.new_rate : (metal?.rate_per?.toString() || '')
          return metal && currentRate !== item.rate_per?.toString()
        })

      if (ratesToUpdate.length > 0) {
        const response = await fetch(`${resolveBackendApiUrl()}/metal-masters/bulk-rates`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ rates: ratesToUpdate })
        })

        const payload = await response.json()
        if (!response.ok) throw new Error(payload.message || 'Failed to update rates')
      }

      await fetchMetals()
      await fetchAllLogs()
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rates')
    } finally {
      setSaving(false)
    }
  }

  const fetchLogs = async (metal: MetalMaster) => {
    if (!accessToken) return
    setSelectedMetal(metal)
    setLogsLoading(true)
    setLogs([])
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/metal-masters/${metal.id}/logs`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })
      const payload = await response.json()
      if (response.ok) {
        setLogs(payload.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch logs', err)
    } finally {
      setLogsLoading(false)
    }
  }

  return (
    <Card elevation={0} sx={{ backgroundColor: 'transparent' }}>
      <CardContent sx={{ px: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={4}>
          <Typography variant="h5" sx={{ color: '#9c8cfc', fontWeight: 500 }}>
            Metal Rate List
          </Typography>
          <Stack spacing={2} alignItems="flex-end">
            <Paper elevation={0} sx={{ backgroundColor: '#eef2ff', px: 2, py: 1, borderRadius: '4px', border: '1px solid #e0e7ff' }}>
              <Typography variant="body2" sx={{ color: '#4f46e5', fontWeight: 'bold' }}>
                Last Update : {lastUpdate}
              </Typography>
            </Paper>
            <Stack direction="row" spacing={2}>
              {isEditing ? (
                <>
                  <Button 
                    variant="contained" 
                    color="success"
                    size="small"
                    onClick={handleSave}
                    disabled={saving}
                    sx={{ textTransform: 'none', px: 4 }}
                  >
                    {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="error"
                    size="small"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                    sx={{ textTransform: 'none', px: 4 }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => setIsEditing(true)}
                  sx={{ color: '#0dcaf0', borderColor: '#0dcaf0', textTransform: 'none', px: 4, '&:hover': { borderColor: '#0baccc', backgroundColor: '#f0fdfd' } }}
                >
                  Edit
                </Button>
              )}
            </Stack>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

        {loading ? (
          <Box display="flex" justifyContent="center" p={10}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer sx={{ border: '1px solid #eaeaea', borderRadius: '4px', backgroundColor: '#fff' }}>
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f3f4ff' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Metal Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Group Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Display Text</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Rate from</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Updated By</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Current Rate</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>New Rate</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Activity Log</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                      No data found
                    </TableCell>
                  </TableRow>
                ) : (
                  metals.map((metal) => (
                    <TableRow key={metal.id} hover>
                      <TableCell sx={{ textTransform: 'uppercase' }}>{metal.metal_name}</TableCell>
                      <TableCell>{metal.group_name || '-'}</TableCell>
                      <TableCell>{metal.display_text || '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {metal.rate_from === 'API' ? 'From ERP API' : 'Manual'}
                        </Typography>
                      </TableCell>
                      <TableCell>{metal.last_rate_log?.user?.name || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {metal.last_rate_log ? 
                          `${metal.last_rate_log.new_rate}/${metal.rate_per_unit === 'Gram' ? '10gm' : 'kg'}` : 
                          (metal.rate_per ? `${metal.rate_per}/${metal.rate_per_unit === 'Gram' ? '10gm' : 'kg'}` : '-')}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <TextField
                            size="small"
                            value={newRates[metal.id] || ''}
                            onChange={(e) => handleRateChange(metal.id, e.target.value)}
                            variant="outlined"
                            sx={{ width: '120px' }}
                            placeholder="0.00"
                          />
                        ) : (
                          <Typography sx={{ fontWeight: 500 }}>
                            {metal.last_rate_log ? 
                              `${metal.last_rate_log.new_rate}/${metal.rate_per_unit === 'Gram' ? '10gm' : 'kg'}` : 
                              (metal.rate_per ? `${metal.rate_per}/${metal.rate_per_unit === 'Gram' ? '10gm' : 'kg'}` : '-')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Button 
                          variant="outlined" 
                          size="small"
                          startIcon={<i className="ri-history-line" />}
                          onClick={() => fetchLogs(metal)}
                          sx={{ color: '#0dcaf0', borderColor: '#0dcaf0', textTransform: 'none', borderRadius: '4px', '&:hover': { borderColor: '#0baccc' } }}
                        >
                          Log
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box mt={4}>
          <Button 
            variant="outlined" 
            onClick={() => router.back()}
            sx={{ color: '#3b82f6', borderColor: '#3b82f6', textTransform: 'none', px: 4 }}
          >
            Back
          </Button>
        </Box>

        {/* Global Activity Log at Bottom */}
        <Box mt={10}>
          <Typography variant="h6" sx={{ mb: 4, color: '#6366f1', fontWeight: 500 }}>
            Recent Activity History
          </Typography>
          <Divider sx={{ mb: 4 }} />
          
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
                {allLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      No recent activity found.
                    </TableCell>
                  </TableRow>
                ) : (
                  allLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.created_at).toLocaleString('en-GB')}</TableCell>
                      <TableCell>{log.user?.name || 'System'}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{log.metal_master?.metal_name || '-'}</TableCell>
                      <TableCell>Update</TableCell>
                      <TableCell>{log.old_rate || '0.00'}</TableCell>
                      <TableCell sx={{ 
                        color: parseFloat(log.new_rate) > parseFloat(log.old_rate || '0') 
                          ? 'success.main' 
                          : parseFloat(log.new_rate) < parseFloat(log.old_rate || '0') 
                            ? 'error.main' 
                            : 'text.primary',
                        fontWeight: parseFloat(log.new_rate) !== parseFloat(log.old_rate || '0') ? 'bold' : 'normal'
                      }}>
                        {log.new_rate}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </CardContent>

      {/* History Log Dialog */}
      <Dialog open={Boolean(selectedMetal)} onClose={() => setSelectedMetal(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '8px' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="span">Rate History - {selectedMetal?.display_text || selectedMetal?.metal_name}</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 0, minHeight: '200px' }}>
          {logsLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" p={10}>
              <CircularProgress />
            </Box>
          ) : logs.length === 0 ? (
            <Box p={10} textAlign="center">
              <Typography color="text.secondary">No history found for this metal.</Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {logs.map((log, index) => (
                <React.Fragment key={log.id}>
                  <ListItem sx={{ py: 3, px: 4 }}>
                    <ListItemText
                      primary={
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body1" component="span" sx={{ color: 'text.secondary', mr: 1 }}>
                              {log.old_rate ? `${log.old_rate}` : '0.00'}
                            </Typography>
                            <Typography component="span" sx={{ mx: 2, color: 'text.disabled' }}>→</Typography>
                            <Typography variant="h6" component="span" sx={{ fontWeight: 'bold', color: '#7367F0' }}>
                              {log.new_rate}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ backgroundColor: '#f0f0f0', px: 1, py: 0.5, borderRadius: '4px' }}>
                            {new Date(log.created_at).toLocaleString('en-GB')}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Updated by: <strong>{log.user?.name || 'System'}</strong>
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < logs.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #eaeaea' }}>
          <Button variant="contained" onClick={() => setSelectedMetal(null)} sx={{ backgroundColor: '#7367F0', textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export default MetalRateListPage
