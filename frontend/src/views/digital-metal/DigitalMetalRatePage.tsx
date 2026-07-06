'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Breadcrumbs,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  Collapse,
  IconButton
} from '@mui/material'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { getApiBaseUrl } from '@/libs/runtimeConfig'

const resolveBackendApiUrl = getApiBaseUrl

const DigitalMetalRatePage = () => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState('')
  const [logs, setLogs] = useState<any[]>([])
  const [activityLogExpanded, setActivityLogExpanded] = useState(false)

  const [rates, setRates] = useState<any[]>([])

  const loadRates = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/digital-metal-masters`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })
      const payload = await response.json()
      if (payload.success) {
        setRates(payload.data.map((m: any) => {
          const baseRate = m.last_log ? parseFloat(m.last_log.new_rate) : parseFloat(m.rate_per || '0');
          const buyMarkup = m.last_log ? parseFloat(m.last_log.new_buy_markup) : parseFloat(m.buy_markup_amount || '0');
          const sellMarkup = m.last_log ? parseFloat(m.last_log.new_sell_markup) : parseFloat(m.sell_markup_amount || '0');
          
          const buyRate = (baseRate + buyMarkup).toFixed(2);
          const sellRate = (baseRate + sellMarkup).toFixed(2);

          return {
            id: m.id,
            metal_name: m.metal_name,
            display_text: m.display_text,
            purity: m.purity,
            rate_from: m.rate_from,
            updated_by: m.last_log?.user?.name || m.creator?.name || '',
            current_buy_rate: buyRate,
            current_sell_rate: sellRate,
            new_buy_rate: buyRate,
            new_sell_rate: sellRate,
            unit: `/${m.rate_per_display_text || 'gm'}`
          };
        }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rates')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

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
        
        if (payload.data && payload.data.length > 0) {
          const latestLog = payload.data[0]
          const date = new Date(latestLog.created_at)
          setLastUpdate(`${date.toLocaleDateString('en-GB')}, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`)
        } else {
          const now = new Date()
          setLastUpdate(`${now.toLocaleDateString('en-GB')}, ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`)
        }
      }
    } catch (err) {
      console.error('Failed to load logs', err)
    }
  }, [accessToken])

  useEffect(() => {
    void loadRates()
    void loadLogs()
  }, [loadRates, loadLogs])

  const handleRateChange = (id: number, field: string, value: string) => {
    setRates(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`${resolveBackendApiUrl()}/digital-metal-masters/bulk-rates`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ rates })
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to update rates')
      }

      await loadRates()
      await loadLogs()
      setTimeout(() => {
        alert('Rates updated successfully')
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const headCellSx = { fontWeight: 700, whiteSpace: 'nowrap' as const }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Digital Metal Rate
          </Typography>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mt: 1 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
              <i className="ri-home-fill" />
            </Link>
            <Typography color="text.primary">Digital Metal Rate</Typography>
          </Breadcrumbs>
        </Box>
        <Box display="flex" alignItems="center" gap={4}>
          <Chip
            label={<><strong>Last Update :</strong> {lastUpdate}</>}
            variant='outlined'
            color='info'
            sx={{ fontSize: '0.8rem', py: 0.5 }}
          />
          <Button 
            variant="outlined" 
            component={Link}
            href="/digital-metal/master"
            color="secondary"
            sx={{ textTransform: 'none', px: 6 }}
          >
            Cancel
          </Button>
        </Box>
      </Stack>

      <Card variant='outlined'>
        <CardContent sx={{ p: { xs: 3, md: 6 } }}>
          <Typography variant="h6" sx={{ mb: 4, fontWeight: 600 }}>
            Metal Rate List
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

          <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={headCellSx}>Metal Name</TableCell>
                  <TableCell sx={headCellSx}>Display Text</TableCell>
                  <TableCell sx={headCellSx}>Purity</TableCell>
                  <TableCell sx={headCellSx}>Rate from</TableCell>
                  <TableCell sx={headCellSx}>Updated By</TableCell>
                  <TableCell sx={headCellSx}>New Customer Buy Rate</TableCell>
                  <TableCell sx={headCellSx}>New Customer Sell Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                      <CircularProgress size={40} />
                    </TableCell>
                  </TableRow>
                ) : rates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 10, color: 'text.secondary' }}>
                      No metal rates found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rates.map(rate => (
                    <TableRow key={rate.id} hover>
                      <TableCell sx={{ fontWeight: 500, textTransform: 'uppercase' }}>{rate.metal_name}</TableCell>
                      <TableCell>{rate.display_text}</TableCell>
                      <TableCell>{rate.purity}</TableCell>
                      <TableCell>
                        <Chip
                          label={rate.rate_from === 'API' ? 'ERP API' : 'Manual'}
                          size='small'
                          color={rate.rate_from === 'API' ? 'info' : 'default'}
                          variant='tonal'
                        />
                      </TableCell>
                      <TableCell>{rate.updated_by || '-'}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <TextField
                            size="small"
                            value={rate.new_buy_rate}
                            onChange={(e) => handleRateChange(rate.id, 'new_buy_rate', e.target.value)}
                            sx={{ width: 110 }}
                          />
                          <Typography variant='body2' color='text.secondary'>{rate.unit}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <TextField
                            size="small"
                            value={rate.new_sell_rate}
                            onChange={(e) => handleRateChange(rate.id, 'new_sell_rate', e.target.value)}
                            sx={{ width: 110 }}
                          />
                          <Typography variant='body2' color='text.secondary'>{rate.unit}</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box mt={4} display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              sx={{ textTransform: 'none', px: 8, py: 1.5 }}
            >
              {saving ? <CircularProgress size={24} color="inherit" /> : 'Update Rates'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Activity History at Bottom */}
      <Card variant='outlined' sx={{ mt: 6 }}>
        <CardContent sx={{ p: { xs: 3, md: 6 } }}>
          <Stack 
            direction="row" 
            justifyContent="space-between" 
            alignItems="center" 
            onClick={() => setActivityLogExpanded(!activityLogExpanded)}
            sx={{ 
              cursor: 'pointer', 
              userSelect: 'none',
              mb: 4, 
              '&:hover': { opacity: 0.85 } 
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6" fontWeight={600}>
                Recent Activity History
              </Typography>
              {logs.length > 0 && (
                <Chip
                  label={`${logs.length} Log Entries`}
                  size='small'
                  color='secondary'
                  variant='tonal'
                />
              )}
            </Stack>
            <IconButton size="small">
              <i className={activityLogExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} style={{ fontSize: '1.5rem' }} />
            </IconButton>
          </Stack>
          <Divider sx={{ mb: 4 }} />
          
          <Collapse in={activityLogExpanded} timeout={300}>
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={headCellSx}>Date & Time</TableCell>
                    <TableCell sx={headCellSx}>Updated By</TableCell>
                    <TableCell sx={headCellSx}>Metal</TableCell>
                    <TableCell sx={headCellSx}>Action</TableCell>
                    <TableCell sx={headCellSx}>Old Rate</TableCell>
                    <TableCell sx={headCellSx}>New Rate</TableCell>
                    <TableCell sx={headCellSx}>Old Markup (B/S)</TableCell>
                    <TableCell sx={headCellSx}>New Markup (B/S)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No recent activity found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell>{new Date(log.created_at).toLocaleString('en-GB')}</TableCell>
                        <TableCell>{log.user?.name || 'System'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{log.digital_metal_master?.metal_name || '-'}</TableCell>
                        <TableCell>Update</TableCell>
                        <TableCell>{log.old_rate}</TableCell>
                        <TableCell sx={{ 
                          color: parseFloat(log.new_rate) > parseFloat(log.old_rate) 
                            ? 'success.main' 
                            : parseFloat(log.new_rate) < parseFloat(log.old_rate) 
                              ? 'error.main' 
                              : 'text.primary',
                          fontWeight: parseFloat(log.new_rate) !== parseFloat(log.old_rate) ? 'bold' : 'normal'
                        }}>
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
          </Collapse>
        </CardContent>
      </Card>
    </Box>
  )
}

export default DigitalMetalRatePage
