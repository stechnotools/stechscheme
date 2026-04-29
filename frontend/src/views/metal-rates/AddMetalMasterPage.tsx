'use client'

import React, { useState, useCallback } from 'react'

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
  CircularProgress
} from '@mui/material'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const AddMetalMasterPage = () => {
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

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const handleSubmit = useCallback(async () => {
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
      const response = await fetch(`${resolveBackendApiUrl()}/metal-masters`, {
        method: 'POST',
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

        throw new Error(validationMessage || payload?.message || 'Failed to save Metal Master')
      }

      router.push('/metal-rates/master')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.')
    } finally {
      setSaving(false)
    }
  }, [
    metalName, ratePer, ratePerUnit, ratePerDisplayText, rateFrom, erpMetalId,
    groupName, displayText, showInDashboard, sortOrder, isDecimalAllow, bookingAmountPercent, statusValue,
    accessToken, router
  ])

  return (
    <Card elevation={0} sx={{ borderRadius: '8px', border: '1px solid #eaeaea', p: 2 }}>
      <CardContent>
        <Typography variant="h6" color="primary" sx={{ mb: 4, fontWeight: 500, color: '#7367F0' }}>
          Metal Create
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
                onChange={(e) => setRatePer(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderTopRightRadius: 0, borderBottomRightRadius: 0 } }}
              />
              <Select
                size="small"
                value={ratePerUnit}
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
              <FormControlLabel value="yes" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight="bold">Yes</Typography>} />
              <FormControlLabel value="no" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight="bold">No</Typography>} />
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
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" fontWeight="bold">Is Decimal Allow</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box display="flex" alignItems="center">
              <Switch
                size="small"
                checked={isDecimalAllow}
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
          <Button 
            variant="outlined" 
            color="success" 
            onClick={handleSubmit} 
            disabled={saving}
            sx={{ textTransform: 'none', px: 4 }}
          >
            {saving ? <CircularProgress size={24} color="inherit" /> : 'Create'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}

export default AddMetalMasterPage
