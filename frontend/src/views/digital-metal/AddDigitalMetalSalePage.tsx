'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Box,
  Stack,
  MenuItem,
  Breadcrumbs,
  Divider,
  CircularProgress,
  Alert,
  Autocomplete,
  InputAdornment
} from '@mui/material'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const AddDigitalMetalSalePage = () => {
  const router = useRouter()
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  // Form State
  const [customers, setCustomers] = useState<any[]>([])
  const [metals, setMetals] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [selectedMetal, setSelectedMetal] = useState<any>(null)
  
  const [weight, setWeight] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [transactionId, setTransactionId] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadInitialData = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const [custRes, metalRes] = await Promise.all([
        fetch(`${resolveBackendApiUrl()}/customers`, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch(`${resolveBackendApiUrl()}/digital-metal-masters`, { headers: { 'Authorization': `Bearer ${accessToken}` } })
      ])
      
      const custData = await custRes.json()
      const metalData = await metalRes.json()
      
      if (custData.success) setCustomers(custData.data)
      if (metalData.success) setMetals(metalData.data)
    } catch (err) {
      setError('Failed to load initial data')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    void loadInitialData()
  }, [loadInitialData])

  // Calculation Logic
  const currentRatePerGm = useMemo(() => {
    if (!selectedMetal) return 0
    const baseRate = parseFloat(selectedMetal.rate_per || '0')
    const unit = parseFloat(selectedMetal.rate_per_unit || '1')
    const markup = parseFloat(selectedMetal.sell_markup_amount || '0')
    return (baseRate + markup) / (unit || 1)
  }, [selectedMetal])

  const handleWeightChange = (val: string) => {
    setWeight(val)
    if (val && currentRatePerGm) {
      setTotalAmount((parseFloat(val) * currentRatePerGm).toFixed(2))
    } else {
      setTotalAmount('')
    }
  }

  const handleAmountChange = (val: string) => {
    setTotalAmount(val)
    if (val && currentRatePerGm) {
      setWeight((parseFloat(val) / currentRatePerGm).toFixed(3))
    } else {
      setWeight('')
    }
  }

  const handleSubmit = async () => {
    if (!selectedCustomer || !selectedMetal || !weight || !totalAmount) {
      setError('Please fill in all required fields')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`${resolveBackendApiUrl()}/digital-metal-sales`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          digital_metal_master_id: selectedMetal.id,
          weight: parseFloat(weight),
          rate_per_gm: currentRatePerGm,
          markup_amount: parseFloat(selectedMetal.sell_markup_amount || '0'),
          total_amount: parseFloat(totalAmount),
          payment_mode: paymentMode,
          transaction_id: transactionId,
          status: 'Completed'
        })
      })

      const payload = await response.json()
      if (response.ok) {
        router.push('/digital-metal/sales')
      } else {
        throw new Error(payload.message || 'Failed to create sale entry')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={20}>
        <CircularProgress />
      </Box>
    )
  }

  const labelSx = { fontWeight: 'bold', mb: 1, display: 'block' }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#6366f1' }}>
            New DigiMetal Sale Entry
          </Typography>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mt: 1 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', color: '#6366f1', textDecoration: 'none' }}>
              <i className="ri-home-fill" />
            </Link>
            <Link href="/digital-metal/sales" style={{ color: '#6366f1', textDecoration: 'none' }}>
              Sales List
            </Link>
            <Typography color="text.primary">New Entry</Typography>
          </Breadcrumbs>
        </Box>
      </Stack>

      <Card sx={{ borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <CardContent sx={{ p: 6 }}>
          {error && <Alert severity="error" sx={{ mb: 6 }}>{error}</Alert>}

          <Grid container spacing={10}>
            {/* Customer & Metal Info */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 4, color: '#6366f1' }}>Customer & Metal</Typography>
              <Stack spacing={6}>
                <Box>
                  <Typography sx={labelSx}>Select Customer *</Typography>
                  <Autocomplete
                    options={customers}
                    getOptionLabel={(option) => `${option.name} (${option.mobile})`}
                    value={selectedCustomer}
                    onChange={(_, val) => setSelectedCustomer(val)}
                    renderInput={(params) => <TextField {...params} size="small" placeholder="Search customer..." />}
                  />
                </Box>

                <Box>
                  <Typography sx={labelSx}>Select Metal *</Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={selectedMetal?.id || ''}
                    onChange={(e) => {
                      const metal = metals.find(m => m.id === e.target.value)
                      setSelectedMetal(metal)
                    }}
                  >
                    {metals.map((m) => (
                      <MenuItem key={m.id} value={m.id}>
                        {m.metal_name} ({m.purity}) - Current Rate: ₹{parseFloat(m.rate_per) + parseFloat(m.sell_markup_amount)}/{m.rate_per_display_text}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                {selectedMetal && (
                  <Box sx={{ p: 4, bgcolor: '#f8faff', borderRadius: '8px', border: '1px dashed #6366f1' }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>Pricing Details</Typography>
                    <Typography variant="body2">Base Rate: ₹{selectedMetal.rate_per} / {selectedMetal.rate_per_display_text}</Typography>
                    <Typography variant="body2">Markup: ₹{selectedMetal.sell_markup_amount} / {selectedMetal.rate_per_display_text}</Typography>
                    <Typography variant="body1" sx={{ mt: 1, fontWeight: 'bold' }}>Final Selling Rate: ₹{currentRatePerGm.toFixed(2)} / gm</Typography>
                  </Box>
                )}
              </Stack>
            </Grid>

            {/* Sale & Payment Info */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 4, color: '#6366f1' }}>Transaction Details</Typography>
              <Stack spacing={6}>
                <Grid container spacing={4}>
                  <Grid item xs={6}>
                    <Typography sx={labelSx}>Purchase Weight (gm) *</Typography>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={weight}
                      onChange={(e) => handleWeightChange(e.target.value)}
                      InputProps={{ endAdornment: <InputAdornment position="end">gm</InputAdornment> }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography sx={labelSx}>Total Amount (INR) *</Typography>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={totalAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    />
                  </Grid>
                </Grid>

                <Box>
                  <Typography sx={labelSx}>Payment Mode</Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  >
                    <MenuItem value="Cash">Cash</MenuItem>
                    <MenuItem value="UPI">UPI / QR</MenuItem>
                    <MenuItem value="Card">Credit/Debit Card</MenuItem>
                    <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                  </TextField>
                </Box>

                <Box>
                  <Typography sx={labelSx}>Transaction Reference #</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Ref ID / Auth ID"
                  />
                </Box>
              </Stack>
            </Grid>
          </Grid>

          <Box mt={12} display="flex" justifyContent="space-between">
            <Button
              variant="outlined"
              onClick={() => router.back()}
              sx={{ borderColor: '#6366f1', color: '#6366f1', textTransform: 'none', px: 8 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={saving || !selectedMetal || !selectedCustomer}
              sx={{ backgroundColor: '#7367F0', '&:hover': { backgroundColor: '#5e54d6' }, textTransform: 'none', px: 12 }}
            >
              {saving ? <CircularProgress size={24} color="inherit" /> : 'Complete Sale Entry'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default AddDigitalMetalSalePage
