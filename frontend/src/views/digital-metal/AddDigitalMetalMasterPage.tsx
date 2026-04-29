'use client'

import React, { useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  MenuItem,
  Button,
  Box,
  Select,
  Alert,
    CircularProgress,
    Switch,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Breadcrumbs,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
  } from '@mui/material'
import Link from 'next/link'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const AddDigitalMetalMasterPage = () => {
  const router = useRouter()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  // Form State
  const [metalName, setMetalName] = useState('GOLD')
  const [purity, setPurity] = useState('24KT')
  const [displayText, setDisplayText] = useState('24KT Gold')
  const [minPurchaseWeight, setMinPurchaseWeight] = useState('0.100')
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('100.00')
  const [maxPurchaseAmount, setMaxPurchaseAmount] = useState('999999.00')
  const [ratePer, setRatePer] = useState('10')
  const [ratePerUnit, setRatePerUnit] = useState('gm')
  const [ratePerDisplayText, setRatePerDisplayText] = useState('10gm')
  const [rateFrom, setRateFrom] = useState('API')
  const [erpMetalId, setErpMetalId] = useState('24 KT')
  const [buyMarkupAmount, setBuyMarkupAmount] = useState('0')
  const [sellMarkupAmount, setSellMarkupAmount] = useState('0')
  const [isDecimalAllow, setIsDecimalAllow] = useState(false)
  const [statusValue, setStatusValue] = useState('Active')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])

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
      const isEdit = Boolean(id)
      const url = isEdit ? `${resolveBackendApiUrl()}/digital-metal-masters/${id}` : `${resolveBackendApiUrl()}/digital-metal-masters`
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          metal_name: metalName,
          purity,
          display_text: displayText,
          min_purchase_weight: minPurchaseWeight ? parseFloat(minPurchaseWeight) : null,
          min_purchase_amount: minPurchaseAmount ? parseFloat(minPurchaseAmount) : null,
          max_purchase_amount: maxPurchaseAmount ? parseFloat(maxPurchaseAmount) : null,
          rate_per: ratePer ? parseFloat(ratePer) : null,
          rate_per_unit: ratePerUnit,
          rate_per_display_text: ratePerDisplayText,
          rate_from: rateFrom,
          erp_metal_id: erpMetalId,
          buy_markup_amount: buyMarkupAmount ? parseFloat(buyMarkupAmount) : 0,
          sell_markup_amount: sellMarkupAmount ? parseFloat(sellMarkupAmount) : 0,
          is_decimal_allow: isDecimalAllow,
          status: statusValue
        })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to save Digital Metal Master')
      }

      router.push('/digital-metal/master')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.')
    } finally {
      setSaving(false)
    }
  }, [
    id, metalName, purity, displayText, minPurchaseWeight, minPurchaseAmount, maxPurchaseAmount,
    ratePer, ratePerUnit, ratePerDisplayText, rateFrom, erpMetalId, buyMarkupAmount,
    sellMarkupAmount, isDecimalAllow, statusValue, accessToken, router
  ])

  const loadMetal = useCallback(async () => {
    if (!accessToken || !id) return

    try {
      const response = await fetch(`${resolveBackendApiUrl()}/digital-metal-masters/${id}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      })
      const payload = await response.json()
      if (payload.success) {
        const m = payload.data
        setMetalName(m.metal_name || '')
        setPurity(m.purity || '')
        setDisplayText(m.display_text || '')
        setMinPurchaseWeight(m.min_purchase_weight?.toString() || '')
        setMinPurchaseAmount(m.min_purchase_amount?.toString() || '')
        setMaxPurchaseAmount(m.max_purchase_amount?.toString() || '')
        setRatePer(m.rate_per?.toString() || '')
        setRatePerUnit(m.rate_per_unit || 'gm')
        setRatePerDisplayText(m.rate_per_display_text || '')
        setRateFrom(m.rate_from || 'Manual')
        setErpMetalId(m.erp_metal_id || '')
        setBuyMarkupAmount(m.buy_markup_amount?.toString() || '0')
        setSellMarkupAmount(m.sell_markup_amount?.toString() || '0')
        setIsDecimalAllow(Boolean(m.is_decimal_allow))
        setStatusValue(m.status || 'Active')
      }

      // Fetch logs
      try {
        const logResponse = await fetch(`${resolveBackendApiUrl()}/digital-metal-masters/${id}/logs`, {
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
      console.error('Failed to load metal', err)
    }
  }, [accessToken, id])

  React.useEffect(() => {
    if (id) {
      void loadMetal()
    }
  }, [id, loadMetal])

  const labelSx = { fontWeight: 'bold', mb: 1, display: 'block' }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#6366f1' }}>
            Digital Metal Master
          </Typography>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mt: 1 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', color: '#6366f1', textDecoration: 'none' }}>
              <i className="ri-home-fill" />
            </Link>
            <Link href="/digital-metal/master" style={{ color: '#6366f1', textDecoration: 'none' }}>
              Digital Metal Master
            </Link>
            <Typography color="text.primary">Digital Metal Master Detail</Typography>
          </Breadcrumbs>
        </Box>
      </Stack>

      <Card sx={{ borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <CardContent sx={{ p: 8 }}>
          <Typography variant="h6" sx={{ mb: 8, color: '#8b5cf6', fontWeight: 500 }}>
            Digital Metal Master Detail
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

          <Grid container spacing={10}>
            {/* Left Column */}
            <Grid item xs={12} md={6}>
              <Stack spacing={6}>
                <Box>
                  <Typography sx={labelSx}>Metal Name</Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={metalName}
                    onChange={(e) => setMetalName(e.target.value)}
                  >
                    <MenuItem value="GOLD">GOLD</MenuItem>
                    <MenuItem value="SILVER">SILVER</MenuItem>
                    <MenuItem value="PLATINUM">PLATINUM</MenuItem>
                  </TextField>
                </Box>

                <Box>
                  <Typography sx={labelSx}>Display Text</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={displayText}
                    onChange={(e) => setDisplayText(e.target.value)}
                  />
                </Box>

                <Box>
                  <Typography sx={labelSx}>Minimum Purchase Amount</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={minPurchaseAmount}
                    onChange={(e) => setMinPurchaseAmount(e.target.value)}
                  />
                </Box>

                <Box>
                  <Typography sx={labelSx}>Rate Per</Typography>
                  <Box display="flex">
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={ratePer}
                      onChange={(e) => setRatePer(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderTopRightRadius: 0, borderBottomRightRadius: 0 } }}
                    />
                    <Select
                      size="small"
                      value={ratePerUnit}
                      onChange={(e) => setRatePerUnit(e.target.value)}
                      sx={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, width: '100px' }}
                    >
                      <MenuItem value="gm">gm</MenuItem>
                      <MenuItem value="kg">kg</MenuItem>
                    </Select>
                  </Box>
                </Box>

                <Box>
                  <Typography sx={labelSx}>Rate from</Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={rateFrom}
                    onChange={(e) => setRateFrom(e.target.value)}
                  >
                    <MenuItem value="API">From ERP API</MenuItem>
                    <MenuItem value="Manual">Manual</MenuItem>
                  </TextField>
                </Box>

                <Box>
                  <Typography sx={labelSx}>Buy Markup Amount</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={buyMarkupAmount}
                    onChange={(e) => setBuyMarkupAmount(e.target.value)}
                  />
                </Box>

                <Box>
                  <Typography sx={labelSx}>Is Decimal Allow</Typography>
                  <Box display="flex" alignItems="center">
                    <Switch
                      checked={isDecimalAllow}
                      onChange={(e) => setIsDecimalAllow(e.target.checked)}
                      color="primary"
                    />
                    <Typography sx={{ ml: 2 }}>{isDecimalAllow ? 'Yes' : 'No'}</Typography>
                  </Box>
                </Box>
              </Stack>
            </Grid>

            {/* Right Column */}
            <Grid item xs={12} md={6}>
              <Stack spacing={6}>
                <Box>
                  <Typography sx={labelSx}>Purity</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={purity}
                    onChange={(e) => setPurity(e.target.value)}
                  />
                </Box>

                <Box>
                  <Typography sx={labelSx}>Min Purchase Weight</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={minPurchaseWeight}
                    onChange={(e) => setMinPurchaseWeight(e.target.value)}
                  />
                </Box>

                <Box>
                  <Typography sx={labelSx}>Max Purchase Amount</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={maxPurchaseAmount}
                    onChange={(e) => setMaxPurchaseAmount(e.target.value)}
                  />
                </Box>

                <Box>
                  <Typography sx={labelSx}>Rate Per Display Text</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={ratePerDisplayText}
                    onChange={(e) => setRatePerDisplayText(e.target.value)}
                  />
                </Box>

                <Box>
                  <Typography sx={labelSx}>ERP Metal Id</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={erpMetalId}
                    onChange={(e) => setErpMetalId(e.target.value)}
                  />
                </Box>

                <Box>
                  <Typography sx={labelSx}>Sell Markup Amount</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={sellMarkupAmount}
                    onChange={(e) => setSellMarkupAmount(e.target.value)}
                  />
                </Box>

                <Box>
                  <Typography sx={labelSx}>Status</Typography>
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
                </Box>
              </Stack>
            </Grid>
          </Grid>

          <Box mt={12} display="flex" justifyContent="space-between">
            <Button
              variant="outlined"
              onClick={() => router.back()}
              sx={{ 
                borderColor: '#6366f1', 
                color: '#6366f1', 
                '&:hover': { borderColor: '#4f46e5', backgroundColor: 'rgba(99, 102, 241, 0.04)' },
                textTransform: 'none', 
                px: 8 
              }}
            >
              Back
            </Button>
            <Stack direction="row" spacing={4}>

              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={saving}
                sx={{
                  backgroundColor: '#7367F0',
                  '&:hover': { backgroundColor: '#5e54d6' },
                  textTransform: 'none',
                  px: 12
                }}
              >
                {saving ? <CircularProgress size={24} color="inherit" /> : isEdit ? 'Update Digital Metal Master' : 'Save Digital Metal Master'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {isEdit && (
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
                        No history found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.created_at).toLocaleString('en-GB')}</TableCell>
                        <TableCell>{log.user?.name || 'System'}</TableCell>
                        <TableCell>{metalName}</TableCell>
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
      )}
    </Box>
  )
}

export default AddDigitalMetalMasterPage
