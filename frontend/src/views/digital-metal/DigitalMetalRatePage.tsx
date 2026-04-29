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
  Paper
} from '@mui/material'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const DigitalMetalRatePage = () => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState('')
  const [logs, setLogs] = useState<any[]>([])

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

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#6366f1' }}>
            Digital Metal Rate
          </Typography>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mt: 1 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', color: '#6366f1', textDecoration: 'none' }}>
              <i className="ri-home-fill" />
            </Link>
            <Typography color="text.primary">Digital Metal Rate</Typography>
          </Breadcrumbs>
        </Box>
        <Box display="flex" alignItems="center" gap={4}>
          <Box sx={{ 
            backgroundColor: '#f3f4ff', 
            border: '1px solid #d1d5db', 
            borderRadius: '4px', 
            px: 3, 
            py: 1,
            color: '#4b5563',
            fontSize: '0.875rem'
          }}>
            <strong>Last Update :</strong> {lastUpdate}
          </Box>
          <Button 
            variant="outlined" 
            component={Link}
            href="/digital-metal/master"
            sx={{ 
                borderColor: '#6366f1', 
                color: '#6366f1', 
                textTransform: 'none',
                px: 6
            }}
          >
            Cancel
          </Button>
        </Box>
      </Stack>

      <Card sx={{ borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <CardContent sx={{ p: 6 }}>
          <Typography variant="h6" sx={{ mb: 6, color: '#8b5cf6', fontWeight: 500 }}>
            Metal Rate List
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

          <TableContainer sx={{ border: '1px solid #eaeaea', borderRadius: '4px' }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f3f4ff' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Metal Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Display Text</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Purity</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Rate from</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Updated By</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Current Customer Buy Rate</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Current Customer Sell Rate</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>New Customer Buy Rate</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>New Customer Sell Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                      <CircularProgress size={40} />
                    </TableCell>
                  </TableRow>
                ) : rates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                      No metal rates found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rates.map(rate => (
                    <TableRow key={rate.id} hover>
                      <TableCell>{rate.metal_name}</TableCell>
                      <TableCell>{rate.display_text}</TableCell>
                      <TableCell>{rate.purity}</TableCell>
                      <TableCell>{rate.rate_from}</TableCell>
                      <TableCell>{rate.updated_by || '-'}</TableCell>
                      <TableCell>{rate.current_buy_rate}{rate.unit}</TableCell>
                      <TableCell>{rate.current_sell_rate}{rate.unit}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <TextField
                            size="small"
                            value={rate.new_buy_rate}
                            onChange={(e) => handleRateChange(rate.id, 'new_buy_rate', e.target.value)}
                            sx={{ width: '100px' }}
                          />
                          <Typography sx={{ ml: 1, color: 'text.secondary', fontSize: '0.875rem' }}>{rate.unit}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <TextField
                            size="small"
                            value={rate.new_sell_rate}
                            onChange={(e) => handleRateChange(rate.id, 'new_sell_rate', e.target.value)}
                            sx={{ width: '100px' }}
                          />
                          <Typography sx={{ ml: 1, color: 'text.secondary', fontSize: '0.875rem' }}>{rate.unit}</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box mt={8} display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              sx={{
                backgroundColor: '#7367F0',
                '&:hover': { backgroundColor: '#5e54d6' },
                textTransform: 'none',
                px: 10,
                py: 2
              }}
            >
              {saving ? <CircularProgress size={24} color="inherit" /> : 'Update Rates'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Activity History at Bottom */}
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
                      <TableCell>{log.digital_metal_master?.metal_name || '-'}</TableCell>
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
        </CardContent>
      </Card>
    </Box>
  )
}

export default DigitalMetalRatePage
