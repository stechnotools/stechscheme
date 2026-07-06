'use client'

import React, { useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Card,
  CardContent,
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
  Breadcrumbs
} from '@mui/material'
import Grid from '@mui/material/Grid'
import Link from 'next/link'
import { getApiBaseUrl } from '@/libs/runtimeConfig'

const resolveBackendApiUrl = getApiBaseUrl

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
    id, isEdit, metalName, purity, displayText, minPurchaseWeight, minPurchaseAmount, maxPurchaseAmount,
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
    } catch (err) {
      console.error('Failed to load metal', err)
    }
  }, [accessToken, id])

  React.useEffect(() => {
    if (id) {
      void loadMetal()
    }
  }, [id, loadMetal])

  const labelSx = { fontWeight: 600, mb: 1.5, display: 'block' }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Digital Metal Master
          </Typography>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mt: 1 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
              <i className="ri-home-fill" />
            </Link>
            <Link href="/digital-metal/master" style={{ color: 'inherit', textDecoration: 'none' }}>
              Digital Metal Master
            </Link>
            <Typography color="text.primary">{isEdit ? 'Edit' : 'Create'} Digital Metal Master</Typography>
          </Breadcrumbs>
        </Box>
      </Stack>

      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 4, md: 6 } }}>
          <Typography variant="h6" sx={{ mb: 6, fontWeight: 600 }}>
            {isEdit ? 'Edit' : 'Create'} Digital Metal Master Details
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

          <Grid container spacing={6}>
            {/* Left Column */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={4}>
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
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={4}>
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

          <Box mt={8} display="flex" justifyContent="space-between">
            <Button
              variant="outlined"
              onClick={() => router.back()}
              color="secondary"
              sx={{ textTransform: 'none', px: 8 }}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={saving}
              sx={{ textTransform: 'none', px: 12 }}
            >
              {saving ? <CircularProgress size={24} color="inherit" /> : isEdit ? 'Update Digital Metal Master' : 'Save Digital Metal Master'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default AddDigitalMetalMasterPage
