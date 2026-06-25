'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { ApexOptions } from 'apexcharts'
import { customerPortalRequest } from '@/libs/customerPortal'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type GoldRate = {
  id: number
  metal_name: string
  purity: string
  rate_per_unit: string
  rate_per_display_text?: string | null
  effective_sell_rate: number
}

type GoldRateHistoryPoint = { date: string; rate: number }

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })

const CustomerPortalGoldRatePage = () => {
  const [rates, setRates] = useState<GoldRate[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [history, setHistory] = useState<GoldRateHistoryPoint[]>([])
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [targetRate, setTargetRate] = useState('')
  const [direction, setDirection] = useState<'above' | 'below'>('below')
  const [savingAlert, setSavingAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await customerPortalRequest<{ data: GoldRate[] }>('/customer-portal/gold-rate')
        setRates(response.data)
        if (response.data.length > 0) setSelectedId(response.data[0].id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load gold rates.')
      }
    }

    void load()
  }, [])

  useEffect(() => {
    if (!selectedId) return

    const loadHistory = async () => {
      try {
        const response = await customerPortalRequest<{ data: { history: GoldRateHistoryPoint[] } }>(
          `/customer-portal/gold-rate/history?master_id=${selectedId}`
        )
        setHistory(response.data.history)
      } catch {
        setHistory([])
      }
    }

    void loadHistory()
  }, [selectedId])

  const selectedRate = rates?.find(rate => rate.id === selectedId) || null

  const handleSetAlert = async () => {
    if (!selectedId || !targetRate.trim()) {
      setAlertMessage('Please enter a target rate.')
      return
    }

    setSavingAlert(true)
    setAlertMessage(null)

    try {
      const response = await customerPortalRequest<{ message: string }>('/customer-portal/gold-rate-alerts', {
        method: 'POST',
        body: JSON.stringify({ digital_metal_master_id: selectedId, target_rate: targetRate, direction })
      })
      setAlertMessage(response.message)
      setTargetRate('')
    } catch (err) {
      setAlertMessage(err instanceof Error ? err.message : 'Failed to set alert.')
    } finally {
      setSavingAlert(false)
    }
  }

  const estimatedWeight = useMemo(() => {
    const numericAmount = Number(amount)
    if (!selectedRate || !numericAmount || selectedRate.effective_sell_rate <= 0) return null

    return numericAmount / selectedRate.effective_sell_rate
  }, [amount, selectedRate])

  const chartOptions: ApexOptions = {
    chart: { toolbar: { show: false } },
    xaxis: { categories: history.map(point => point.date) },
    stroke: { curve: 'smooth', width: 3 },
    colors: ['#f59e0b'],
    dataLabels: { enabled: false },
    grid: { strokeDashArray: 4 }
  }

  const chartSeries = [{ name: 'Rate', data: history.map(point => point.rate) }]

  if (!rates) {
    return (
      <Box sx={{ p: 4 }}>
        {error ? <Alert severity='error'>{error}</Alert> : <Stack alignItems='center' sx={{ mt: 6 }}><CircularProgress /></Stack>}
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        {error ? <Alert severity='warning'>{error}</Alert> : null}

        {rates.length === 0 ? (
          <Alert severity='info'>No live rates are published right now.</Alert>
        ) : (
          <>
            <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap>
              {rates.map(rate => (
                <Chip
                  key={rate.id}
                  label={`${rate.metal_name} ${rate.purity} • ${currencyFormatter.format(rate.effective_sell_rate)}/${rate.rate_per_unit}`}
                  color={rate.id === selectedId ? 'primary' : 'default'}
                  variant={rate.id === selectedId ? 'filled' : 'outlined'}
                  onClick={() => setSelectedId(rate.id)}
                />
              ))}
            </Stack>

            {selectedRate && (
              <Card sx={{ color: 'common.white', background: 'linear-gradient(135deg, #0f172a 0%, #155e75 55%, #f59e0b 100%)' }}>
                <CardContent>
                  <Typography variant='overline' sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    {selectedRate.metal_name} {selectedRate.purity}
                  </Typography>
                  <Typography variant='h3'>
                    {currencyFormatter.format(selectedRate.effective_sell_rate)} / {selectedRate.rate_per_unit}
                  </Typography>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent>
                <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', mb: 2 }}>
                  Rate History
                </Typography>
                {history.length > 0 ? (
                  <AppReactApexCharts type='line' height={260} width='100%' options={chartOptions} series={chartSeries} />
                ) : (
                  <Typography color='text.secondary'>No rate history available yet for this metal.</Typography>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Estimate Gold Weight
                  </Typography>
                  <TextField
                    fullWidth
                    size='small'
                    label='Amount'
                    value={amount}
                    onChange={event => setAmount(event.target.value.replace(/[^0-9.]/g, ''))}
                    InputProps={{ startAdornment: <InputAdornment position='start'>₹</InputAdornment> }}
                  />
                  {estimatedWeight !== null && (
                    <Alert severity='success'>
                      Approximately <strong>{estimatedWeight.toFixed(3)} {selectedRate?.rate_per_unit}</strong> of {selectedRate?.metal_name} {selectedRate?.purity} at today&apos;s rate.
                    </Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Notify Me When Rate Crosses
                  </Typography>
                  {alertMessage ? <Alert severity='info'>{alertMessage}</Alert> : null}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <FormControl size='small' sx={{ minWidth: 120 }}>
                      <InputLabel>Direction</InputLabel>
                      <Select label='Direction' value={direction} onChange={event => setDirection(event.target.value as 'above' | 'below')}>
                        <MenuItem value='below'>Falls below</MenuItem>
                        <MenuItem value='above'>Rises above</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      size='small'
                      label='Target Rate'
                      value={targetRate}
                      onChange={event => setTargetRate(event.target.value.replace(/[^0-9.]/g, ''))}
                      InputProps={{ startAdornment: <InputAdornment position='start'>₹</InputAdornment> }}
                    />
                    <Button variant='contained' onClick={() => void handleSetAlert()} disabled={savingAlert}>
                      {savingAlert ? 'Saving...' : 'Set Alert'}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </>
        )}
      </Stack>
    </Box>
  )
}

export default CustomerPortalGoldRatePage
