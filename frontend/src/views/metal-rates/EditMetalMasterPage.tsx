'use client'

import React, { useState, useCallback, useEffect } from 'react'

import { useRouter } from 'next/navigation'

import { useSession } from 'next-auth/react'

import {
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  Switch,
  Button,
  Box,
  Select,
  Alert,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const EditMetalMasterPage = ({ id, isView = false }: { id: string; isView?: boolean }) => {
  const router = useRouter()

  const [metalName, setMetalName] = useState('')
  const [ratePer, setRatePer] = useState('')
  const [ratePerUnit, setRatePerUnit] = useState('Gram')
  const [ratePerDisplayText, setRatePerDisplayText] = useState('')
  const [rateFrom, setRateFrom] = useState('Manual')
  const [erpMetalId, setErpMetalId] = useState('')
  const [groupName, setGroupName] = useState('')
  const [displayText, setDisplayText] = useState('')
  const [showInDashboard, setShowInDashboard] = useState('yes')
  const [sortOrder, setSortOrder] = useState('')
  const [isDecimalAllow, setIsDecimalAllow] = useState(false)
  const [bookingAmountPercent, setBookingAmountPercent] = useState('')
  const [statusValue, setStatusValue] = useState('Active')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])

  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const loadData = useCallback(async () => {
    if (!accessToken || !id) return

    try {
      const response = await fetch(`${resolveBackendApiUrl()}/metal-masters/${id}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })

      const payload = await response.json()

      if (!response.ok) throw new Error(payload.message || 'Failed to fetch data')
      
      const data = payload.data

      setMetalName(data.metal_name || '')
      setRatePer(data.rate_per ? data.rate_per.toString() : '')
      setRatePerUnit(data.rate_per_unit || 'Gram')
      setRatePerDisplayText(data.rate_per_display_text || '')
      setRateFrom(data.rate_from || 'Manual')
      setErpMetalId(data.erp_metal_id || '')
      setGroupName(data.group_name || '')
      setDisplayText(data.display_text || '')
      setShowInDashboard(data.show_in_dashboard ? 'yes' : 'no')
      setSortOrder(data.sort_order ? data.sort_order.toString() : '')
      setIsDecimalAllow(Boolean(data.is_decimal_allow))
      setBookingAmountPercent(data.booking_amount_percent ? data.booking_amount_percent.toString() : '')
      setStatusValue(data.status || 'Active')

      // Fetch logs
      try {
        const logResponse = await fetch(`${resolveBackendApiUrl()}/metal-masters/${id}/logs`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        })
        const logPayload = await logResponse.json()
        if (logPayload.success) {
          setLogs(logPayload.data)
        }
      } catch (logErr) {
        console.error('Failed to load logs', logErr)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading data')
    } finally {
      setLoading(false)
    }
  }, [id, accessToken])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleSubmit = useCallback(async () => {
    if (isView) return
    
    if (!metalName) {
      setError('Metal Name is required.')
      
return
    }

    if (!accessToken) {
      setError('Authentication missing. Please log in again.')
      
return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`${resolveBackendApiUrl()}/metal-masters/${id}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          metal_name: metalName,
          rate_per: ratePer || null,
          rate_per_unit: ratePerUnit || null,
          rate_per_display_text: ratePerDisplayText || null,
          rate_from: rateFrom,
          erp_metal_id: erpMetalId || null,
          group_name: groupName || null,
          display_text: displayText || null,
          show_in_dashboard: showInDashboard === 'yes',
          sort_order: sortOrder ? parseInt(sortOrder) : null,
          is_decimal_allow: isDecimalAllow,
          booking_amount_percent: bookingAmountPercent ? parseFloat(bookingAmountPercent) : null,
          status: statusValue
        })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const validationMessage = payload?.errors
          ? Object.values(payload.errors).flat().join(' ')
          : null

        throw new Error(validationMessage || payload?.message || 'Failed to update Metal Master')
      }

      router.push('/metal-rates/master')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.')
    } finally {
      setSaving(false)
    }
  }, [
    id, metalName, ratePer, ratePerUnit, ratePerDisplayText, rateFrom, erpMetalId,
    groupName, displayText, showInDashboard, sortOrder, isDecimalAllow, bookingAmountPercent, statusValue,
    accessToken, router, isView
  ])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
    <Card elevation={0} sx={{ borderRadius: '8px', border: '1px solid #eaeaea', p: 2 }}>
      <CardContent>
        <Typography variant="h6" color="primary" sx={{ mb: 4, fontWeight: 500, color: '#7367F0' }}>
          {isView ? 'Metal Details' : 'Metal Update'}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

        <Grid container spacing={4} alignItems="center">
          {/* Row 1 */}
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" fontWeight="bold">Metal Name</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              value={metalName}
              disabled={isView}
              onChange={(e) => setMetalName(e.target.value)}
              SelectProps={{ displayEmpty: true }}
            >
              <MenuItem value="" disabled>-- Metal Name --</MenuItem>
              <MenuItem value="Gold">Gold</MenuItem>
              <MenuItem value="Silver">Silver</MenuItem>
              <MenuItem value="Platinum">Platinum</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" fontWeight="bold">Rate Per</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box display="flex">
              <TextField
                fullWidth
                size="small"
                value={ratePer}
                disabled={isView}
                onChange={(e) => setRatePer(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderTopRightRadius: 0, borderBottomRightRadius: 0 } }}
              />
              <Select
                size="small"
                value={ratePerUnit}
                disabled={isView}
                onChange={(e) => setRatePerUnit(e.target.value)}
                sx={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, width: '120px' }}
              >
                <MenuItem value="Gram">Gram</MenuItem>
                <MenuItem value="Kg">Kg</MenuItem>
              </Select>
            </Box>
          </Grid>

          {/* Row 2 */}
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" fontWeight="bold">Rate Per Display Text</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              value={ratePerDisplayText}
              disabled={isView}
              onChange={(e) => setRatePerDisplayText(e.target.value)}
              SelectProps={{ displayEmpty: true }}
            >
              <MenuItem value="" disabled>-- Rate Per Display Text --</MenuItem>
              <MenuItem value="Per Gram">Per Gram</MenuItem>
              <MenuItem value="Per 8 Grams">Per 8 Grams</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" fontWeight="bold">Rate from</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              value={rateFrom}
              disabled={isView}
              onChange={(e) => setRateFrom(e.target.value)}
            >
              <MenuItem value="Manual">Manual</MenuItem>
              <MenuItem value="API">API</MenuItem>
            </TextField>
          </Grid>

          {/* Row 3 - ERP Metal ID and Booking Amount */}
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" fontWeight="bold">Booking Amount %</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="0.00"
              value={bookingAmountPercent}
              disabled={isView}
              onChange={(e) => setBookingAmountPercent(e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" fontWeight="bold">ERP Metal Id</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="ERP Metal Id"
              value={erpMetalId}
              disabled={isView}
              onChange={(e) => setErpMetalId(e.target.value)}
            />
          </Grid>

          {/* Row 4 */}
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 2 }}>Group Name</Typography>
          </Grid>
          <Grid item xs={12} md={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              size="small"
              value={groupName}
              disabled={isView}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 2 }}>Display Text</Typography>
          </Grid>
          <Grid item xs={12} md={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              size="small"
              value={displayText}
              disabled={isView}
              onChange={(e) => setDisplayText(e.target.value)}
            />
          </Grid>

          {/* Row 5 */}
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" fontWeight="bold">Show in Dashboard</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <RadioGroup
              row
              value={showInDashboard}
              onChange={(e) => setShowInDashboard(e.target.value)}
            >
              <FormControlLabel disabled={isView} value="yes" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight="bold">Yes</Typography>} />
              <FormControlLabel disabled={isView} value="no" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight="bold">No</Typography>} />
            </RadioGroup>
          </Grid>

          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" fontWeight="bold">Sort Order</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              value={sortOrder}
              disabled={isView}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </Grid>

          {/* Row 6 */}
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" fontWeight="bold">Is Decimal Allow</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box display="flex" alignItems="center">
              <Switch
                size="small"
                checked={isDecimalAllow}
                disabled={isView}
                onChange={(e) => setIsDecimalAllow(e.target.checked)}
              />
              <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
                {isDecimalAllow ? 'Yes' : 'No'}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              value={statusValue}
              disabled={isView}
              onChange={(e) => setStatusValue(e.target.value)}
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </TextField>
          </Grid>

        </Grid>
        
        <Box display="flex" justifyContent="space-between" mt={8} sx={{ borderTop: '1px solid #eaeaea', pt: 3, mx: -2, px: 2, pb: 1, backgroundColor: '#fcfcfc' }}>
          <Button variant="outlined" onClick={() => router.back()} sx={{ borderColor: '#66c2ff', color: '#66c2ff', textTransform: 'none', px: 4 }}>
            Back
          </Button>
          {!isView && (
            <Button 
              variant="outlined" 
              color="success" 
              onClick={handleSubmit} 
              disabled={saving}
              sx={{ textTransform: 'none', px: 4 }}
            >
              {saving ? <CircularProgress size={24} color="inherit" /> : 'Update'}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>

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
                  <TableCell>{metalName}</TableCell>
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
  </>
)
}

export default EditMetalMasterPage
