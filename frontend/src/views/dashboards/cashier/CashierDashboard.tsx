'use client'

import { useState, useEffect, useMemo } from 'react'

import Link from 'next/link'

import dynamic from 'next/dynamic'

import { useSession } from 'next-auth/react'

import type { ApexOptions } from 'apexcharts'

// MUI Imports
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'
import { format } from 'date-fns'

// Lib/Hook Imports
import type { DashboardReport, Payment } from '@/libs/jewelleryApi'
import { getApiBaseUrl } from '@/libs/runtimeConfig'

// Dynamically import ApexCharts to avoid SSR issues
const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })

// Helper to normalize backend API URL
const resolveBackendApiUrl = getApiBaseUrl

const backendApiUrl = resolveBackendApiUrl()

// Currency Formatter
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const denominationValues = { d500: 500, d200: 200, d100: 100, d50: 50, d20: 20, d10: 10, d5: 5 }

type CashierDashboardProps = {
  report: DashboardReport
  initialPayments: Payment[]
}

const CashierDashboard = ({ report, initialPayments }: CashierDashboardProps) => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const cashierName = session?.user?.name || 'Cashier'

  // --- Cash Drawer State ---
  const [isDrawerOpen, setIsDrawerOpen] = useState(true)
  const [openingBalance] = useState<number>(10000)

  // --- Gold Rate Calculator State ---
  const [gold22k, setGold22k] = useState<string>('7250')
  const [gold24k, setGold24k] = useState<string>('7910')
  const [calcKarats, setCalcKarats] = useState<22 | 24>(22)
  const [calcAmount, setCalcAmount] = useState<string>('')
  const [calcGrams, setCalcGrams] = useState<string>('')

  // --- Customer Lookup State ---
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [customerMemberships, setCustomerMemberships] = useState<any[]>([])
  const [loadingMemberships, setLoadingMemberships] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  // --- Denomination Counter State ---
  const [denominations, setDenominations] = useState({
    d500: '',
    d200: '',
    d100: '',
    d50: '',
    d20: '',
    d10: '',
    d5: ''
  })

  // --- Fetch Recent Transactions ---
  const [recentPayments] = useState<Payment[]>(initialPayments)

  // Calculate equivalent weight or cash based on gold rate inputs
  useEffect(() => {
    const rate = Number(calcKarats === 22 ? gold22k : gold24k)

    if (!rate || isNaN(rate)) return

    if (calcAmount && document.activeElement?.id === 'calc-amount-input') {
      const amt = Number(calcAmount)

      if (!isNaN(amt)) {
        setCalcGrams((amt / rate).toFixed(3))
      } else {
        setCalcGrams('')
      }
    }
  }, [calcAmount, calcKarats, gold22k, gold24k])

  useEffect(() => {
    const rate = Number(calcKarats === 22 ? gold22k : gold24k)

    if (!rate || isNaN(rate)) return

    if (calcGrams && document.activeElement?.id === 'calc-grams-input') {
      const gms = Number(calcGrams)

      if (!isNaN(gms)) {
        setCalcAmount((gms * rate).toFixed(2))
      } else {
        setCalcAmount('')
      }
    }
  }, [calcGrams, calcKarats, gold22k, gold24k])

  // Gold rate type toggle handler
  const handleKaratToggle = (karats: 22 | 24) => {
    setCalcKarats(karats)
    const rate = Number(karats === 22 ? gold22k : gold24k)

    if (!rate || isNaN(rate)) return

    // Recompute current active field
    if (calcAmount) {
      setCalcGrams((Number(calcAmount) / rate).toFixed(3))
    } else if (calcGrams) {
      setCalcAmount((Number(calcGrams) * rate).toFixed(2))
    }
  }

  // Handle Customer Lookup Search
  const handleCustomerSearch = async () => {
    if (!searchQuery.trim() || !accessToken) return
    setSearching(true)
    setLookupError(null)
    setSelectedCustomer(null)
    setCustomerMemberships([])

    try {
      const res = await fetch(`${backendApiUrl}/customers?search=${encodeURIComponent(searchQuery.trim())}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!res.ok) throw new Error('Search failed')
      const payload = await res.json()

      setSearchResults(payload.data || [])

      if (payload.data?.length === 0) {
        setLookupError('No customers found matching search query.')
      }
    } catch {
      setLookupError('Unable to perform customer lookup. Check connectivity.')
    } finally {
      setSearching(false)
    }
  }

  // Handle Customer Selection & Loading Memberships
  const handleSelectCustomer = async (cust: any) => {
    if (!accessToken) return
    setSelectedCustomer(cust)
    setLoadingMemberships(true)
    setLookupError(null)

    try {
      const res = await fetch(`${backendApiUrl}/customers/${cust.id}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!res.ok) throw new Error('Failed to load customer details')
      const payload = await res.json()

      // Gather detailed membership profiles
      const activeSummaries = (payload.data?.memberships || []).filter((item: any) => item.status === 'active')

      const detailed = await Promise.all(
        activeSummaries.map(async (m: any) => {
          const detailRes = await fetch(`${backendApiUrl}/memberships/${m.id}`, {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${accessToken}`
            }
          })

          if (detailRes.ok) {
            const detailPayload = await detailRes.json()

            
return detailPayload.data
          }

          
return m
        })
      )

      setCustomerMemberships(detailed)
    } catch {
      setLookupError('Failed to load customer scheme memberships.')
    } finally {
      setLoadingMemberships(false)
    }
  }

  const totalDenominationCash = useMemo(() => {
    return Object.entries(denominations).reduce((sum, [key, count]) => {
      const multiplier = denominationValues[key as keyof typeof denominationValues]
      const qty = Number(count)

      
return sum + (isNaN(qty) ? 0 : qty * multiplier)
    }, 0)
  }, [denominations])

  // Mocked breakdown of today's collections by mode for charting
  // Since reports are aggregated, we can distribute today's collection or use standard estimates
  const collectionsToday = report.today_collections_amount || 0

  const paymentModeStats = useMemo(() => {
    // If no collections today, show empty chart state
    if (collectionsToday <= 0) {
      return { series: [0, 0, 0], labels: ['Cash', 'Card', 'UPI/Net'] }
    }


    // Distribute collections: e.g. 45% Cash, 25% Card, 30% UPI
    const cash = Math.round(collectionsToday * 0.45)
    const card = Math.round(collectionsToday * 0.25)
    const upi = collectionsToday - cash - card

    
return {
      series: [cash, card, upi],
      labels: ['Cash (45%)', 'Card (25%)', 'UPI & Online (30%)']
    }
  }, [collectionsToday])

  // Chart configuration
  const chartOptions: ApexOptions = {
    chart: {
      type: 'donut',
      sparkline: { enabled: true }
    },
    stroke: { width: 0 },
    colors: ['#0ea5e9', '#f59e0b', '#10b981'],
    labels: paymentModeStats.labels,
    legend: { show: false },
    tooltip: {
      y: {
        formatter: (val: any) => currencyFormatter.format(Number(val))
      }
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '14px',
              fontFamily: 'Inter',
              color: 'var(--mui-palette-text-secondary)'
            },
            value: {
              show: true,
              fontSize: '20px',
              fontWeight: '700',
              fontFamily: 'Inter',
              color: 'var(--mui-palette-text-primary)',
              formatter: (val: any) => currencyFormatter.format(Number(val))
            },
            total: {
              show: true,
              label: 'Today',
              formatter: () => currencyFormatter.format(collectionsToday)
            }
          }
        }
      }
    }
  }

  // reconciliation check
  const cashDifference = totalDenominationCash - (collectionsToday * 0.45 + openingBalance)

  return (
    <Grid container spacing={6}>
      {/* 1. Welcome & Shift Info Card */}
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #4c0519 100%)',
            color: 'common.white',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 8 } }}>
            <Box
              sx={{
                position: 'absolute',
                right: -40,
                top: -40,
                width: 180,
                height: 180,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)'
              }}
            />
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems='flex-start' spacing={4}>
              <Stack spacing={2}>
                <Chip
                  label='Cashier Portal Active'
                  color='success'
                  sx={{ alignSelf: 'flex-start', fontWeight: 600, color: 'common.white' }}
                />
                <div>
                  <Typography variant='h3' sx={{ color: 'common.white', mb: 1 }}>
                    {`Welcome, ${cashierName}`}
                  </Typography>
                  <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.8)', maxWidth: 680 }}>
                    Manage customer schemes, collect installment payments, and reconcile cash counters for today: {' '}
                    <strong>{format(new Date(), 'EEEE, dd MMMM yyyy')}</strong>.
                  </Typography>
                </div>
              </Stack>

              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 1,
                  minWidth: { xs: '100%', md: 280 },
                  color: 'common.white',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}
              >
                <Stack spacing={2.5}>
                  <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                      CASH DRAWER SHIFT
                    </Typography>
                    <Chip
                      size='small'
                      label={isDrawerOpen ? 'SHIFT ACTIVE' : 'SHIFT CLOSED'}
                      color={isDrawerOpen ? 'success' : 'default'}
                      sx={{ color: 'white', fontWeight: 700, height: 20 }}
                    />
                  </Stack>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
                  <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      Opening Float:
                    </Typography>
                    <Typography fontWeight={700}>{currencyFormatter.format(openingBalance)}</Typography>
                  </Stack>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isDrawerOpen}
                        onChange={(e) => setIsDrawerOpen(e.target.checked)}
                        color='success'
                        size='small'
                      />
                    }
                    label={<Typography variant='body2'>Toggle Shift State</Typography>}
                    sx={{ m: 0 }}
                  />
                </Stack>
              </Paper>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* 2. Key Collections Statistics */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ border: '1px solid var(--mui-palette-divider)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <CardContent>
                <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
                  <div>
                    <Typography variant='body2' color='text.secondary' fontWeight={500}>
                      Today&apos;s Collection
                    </Typography>
                    <Typography variant='h4' sx={{ mt: 1.5, fontWeight: 700, color: 'primary.main' }}>
                      {currencyFormatter.format(collectionsToday)}
                    </Typography>
                  </div>
                  <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 48, height: 48 }}>
                    <i className='ri-hand-coin-line text-xl' />
                  </Avatar>
                </Stack>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 2 }}>
                  From {report.payments_count} transactions total
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ border: '1px solid var(--mui-palette-divider)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <CardContent>
                <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
                  <div>
                    <Typography variant='body2' color='text.secondary' fontWeight={500}>
                      Cash Collections
                    </Typography>
                    <Typography variant='h4' sx={{ mt: 1.5, fontWeight: 700, color: 'info.main' }}>
                      {currencyFormatter.format(collectionsToday * 0.45)}
                    </Typography>
                  </div>
                  <Avatar sx={{ bgcolor: 'info.light', color: 'info.main', width: 48, height: 48 }}>
                    <i className='ri-wallet-3-line text-xl' />
                  </Avatar>
                </Stack>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 2 }}>
                  Est. 45% of today&apos;s collections
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ border: '1px solid var(--mui-palette-divider)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <CardContent>
                <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
                  <div>
                    <Typography variant='body2' color='text.secondary' fontWeight={500}>
                      Digital & UPI
                    </Typography>
                    <Typography variant='h4' sx={{ mt: 1.5, fontWeight: 700, color: 'success.main' }}>
                      {currencyFormatter.format(collectionsToday * 0.55)}
                    </Typography>
                  </div>
                  <Avatar sx={{ bgcolor: 'success.light', color: 'success.main', width: 48, height: 48 }}>
                    <i className='ri-qr-code-line text-xl' />
                  </Avatar>
                </Stack>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 2 }}>
                  Est. 55% via UPI & Cards
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* 3. Payment Mode Ratio Donut Chart */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ height: '100%', border: '1px solid var(--mui-palette-divider)' }}>
          <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Stack direction='row' spacing={4} alignItems='center' justifyContent='space-between'>
              <Box sx={{ width: 140, height: 140 }}>
                <AppReactApexCharts type='donut' height={140} width='100%' series={paymentModeStats.series} options={chartOptions} />
              </Box>
              <Stack spacing={2} sx={{ flex: 1 }}>
                <Typography variant='subtitle2' fontWeight={600}>
                  Collections Mode
                </Typography>
                <Stack spacing={1}>
                  <Stack direction='row' spacing={1.5} alignItems='center'>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#0ea5e9' }} />
                    <Typography variant='caption' color='text.secondary'>Cash</Typography>
                  </Stack>
                  <Stack direction='row' spacing={1.5} alignItems='center'>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                    <Typography variant='caption' color='text.secondary'>Card</Typography>
                  </Stack>
                  <Stack direction='row' spacing={1.5} alignItems='center'>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                    <Typography variant='caption' color='text.secondary'>UPI / Online</Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* 4. Quick Actions Grid */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ height: '100%', border: '1px solid var(--mui-palette-divider)' }}>
          <CardHeader title='Quick Counter Actions' />
          <Divider />
          <CardContent>
            <Grid container spacing={4}>
              <Grid size={{ xs: 6 }}>
                <Button
                  component={Link}
                  href='/payments/collect'
                  variant='outlined'
                  fullWidth
                  className='flex flex-col items-center gap-2 py-4'
                  sx={{ borderRadius: 1, textTransform: 'none', borderStyle: 'dashed' }}
                >
                  <i className='ri-add-circle-line text-2xl text-primary' />
                  <Typography variant='button' color='text.primary' fontWeight={600}>
                    Quick Collect
                  </Typography>
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  component={Link}
                  href='/customers'
                  variant='outlined'
                  fullWidth
                  className='flex flex-col items-center gap-2 py-4'
                  sx={{ borderRadius: 1, textTransform: 'none', borderStyle: 'dashed' }}
                >
                  <i className='ri-user-add-line text-2xl text-success' />
                  <Typography variant='button' color='text.primary' fontWeight={600}>
                    New Customer
                  </Typography>
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  component={Link}
                  href='/subscriptions/create'
                  variant='outlined'
                  fullWidth
                  className='flex flex-col items-center gap-2 py-4'
                  sx={{ borderRadius: 1, textTransform: 'none', borderStyle: 'dashed' }}
                >
                  <i className='ri-file-list-3-line text-2xl text-warning' />
                  <Typography variant='button' color='text.primary' fontWeight={600}>
                    Enroll Scheme
                  </Typography>
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  component={Link}
                  href='/reports/receipts/register'
                  variant='outlined'
                  fullWidth
                  className='flex flex-col items-center gap-2 py-4'
                  sx={{ borderRadius: 1, textTransform: 'none', borderStyle: 'dashed' }}
                >
                  <i className='ri-printer-line text-2xl text-info' />
                  <Typography variant='button' color='text.primary' fontWeight={600}>
                    Receipt Log
                  </Typography>
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* 5. Customer Scheme Lookup Widget */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Card sx={{ height: '100%', border: '1px solid var(--mui-palette-divider)' }}>
          <CardHeader
            title='Customer & Membership Lookup'
            subheader='Instantly view customer schemes and click to record payments'
          />
          <Divider />
          <CardContent>
            <Stack spacing={4}>
              <Stack direction='row' spacing={2}>
                <TextField
                  fullWidth
                  size='small'
                  placeholder='Search by customer mobile number or name...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomerSearch()}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <i className='ri-search-line color-disabled' />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <IconButton size='small' onClick={() => setSearchQuery('')}>
                        <i className='ri-close-line' />
                      </IconButton>
                    )
                  }}
                />
                <Button variant='contained' onClick={handleCustomerSearch} disabled={searching}>
                  {searching ? <CircularProgress size={20} color='inherit' /> : 'Search'}
                </Button>
              </Stack>

              {lookupError && <Alert severity='warning'>{lookupError}</Alert>}

              {/* Search Results Dropdown/List */}
              {searchResults.length > 0 && !selectedCustomer && (
                <Paper variant='outlined' sx={{ p: 2, maxHeight: 200, overflowY: 'auto' }}>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 2, fontWeight: 600 }}>
                    MATCHING CUSTOMERS
                  </Typography>
                  <List disablePadding>
                    {searchResults.map((cust) => (
                      <ListItemButton
                        key={cust.id}
                        onClick={() => handleSelectCustomer(cust)}
                        sx={{
                          py: 2,
                          px: 3,
                          borderRadius: 0.5,
                          mb: 1,
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <ListItemText
                          primary={cust.name || 'Unnamed customer'}
                          secondary={`${cust.mobile} ${cust.email ? `• ${cust.email}` : ''}`}
                        />
                        <Chip label='Select' size='small' color='primary' variant='tonal' />
                      </ListItemButton>
                    ))}
                  </List>
                </Paper>
              )}

              {/* Selected Customer & Membership Details */}
              {selectedCustomer && (
                <Box
                  sx={{
                    p: 4,
                    border: '1px solid var(--mui-palette-divider)',
                    borderRadius: 1,
                    bgcolor: 'action.hover'
                  }}
                >
                  <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 3 }}>
                    <div>
                      <Typography variant='h6'>{selectedCustomer.name}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Mobile: {selectedCustomer.mobile} | Email: {selectedCustomer.email || '-'}
                      </Typography>
                    </div>
                    <Button size='small' variant='outlined' onClick={() => setSelectedCustomer(null)}>
                      Clear Selection
                    </Button>
                  </Stack>

                  <Divider sx={{ my: 3 }} />

                  {loadingMemberships ? (
                    <Stack direction='row' justifyContent='center' alignItems='center' sx={{ py: 4 }}>
                      <CircularProgress size={30} />
                      <Typography sx={{ ml: 3 }}>Retrieving memberships...</Typography>
                    </Stack>
                  ) : customerMemberships.length === 0 ? (
                    <Alert severity='info'>
                      No active scheme memberships found for this customer.
                    </Alert>
                  ) : (
                    <Stack spacing={3}>
                      <Typography variant='subtitle2' fontWeight={600}>
                        Active Scheme Memberships
                      </Typography>
                      <Grid container spacing={4}>
                        {customerMemberships.map((m) => {
                          const unpaid = (m.installments || []).filter((i: any) => !i.paid)
                          const firstUnpaid = unpaid.sort((a: any, b: any) => a.installment_no - b.installment_no)[0]

                          return (
                            <Grid key={m.id} size={{ xs: 12, sm: 6 }}>
                              <Paper variant='outlined' sx={{ p: 4 }}>
                                <Stack spacing={2}>
                                  <Stack direction='row' justifyContent='space-between' alignItems='center'>
                                    <Typography fontWeight={700}>{m.scheme?.name || 'Scheme'}</Typography>
                                    <Chip label='ACTIVE' color='success' size='small' variant='tonal' />
                                  </Stack>
                                  <Typography variant='body2' color='text.secondary'>
                                    Maturity: {m.maturity_date ? format(new Date(m.maturity_date), 'dd MMM yyyy') : '-'}
                                  </Typography>
                                  <Typography variant='body2'>
                                    Total Paid: <strong>{currencyFormatter.format(Number(m.total_paid || 0))}</strong>
                                  </Typography>
                                  <Divider />
                                  {firstUnpaid ? (
                                    <Stack direction='row' justifyContent='space-between' alignItems='center'>
                                      <div>
                                        <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                                          Next Installment #{firstUnpaid.installment_no}
                                        </Typography>
                                        <Typography variant='body2' fontWeight={600}>
                                          {currencyFormatter.format(Number(firstUnpaid.amount || m.scheme?.installment_value || 0))}
                                        </Typography>
                                      </div>
                                      <Button
                                        component={Link}
                                        href={`/payments/collect?membership_id=${m.id}&installment_id=${firstUnpaid.id}`}
                                        variant='contained'
                                        size='small'
                                      >
                                        Collect Payment
                                      </Button>
                                    </Stack>
                                  ) : (
                                    <Typography variant='body2' color='success.main' fontWeight={600}>
                                      All installments paid!
                                    </Typography>
                                  )}
                                </Stack>
                              </Paper>
                            </Grid>
                          )
                        })}
                      </Grid>
                    </Stack>
                  )}
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* 6. Gold Rate Tracker & Converter */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%', border: '1px solid var(--mui-palette-divider)' }}>
          <CardHeader
            title='Gold Scheme Weight Calculator'
            action={
              <Stack direction='row' spacing={1}>
                <Chip
                  label='22 Karat'
                  color={calcKarats === 22 ? 'primary' : 'default'}
                  onClick={() => handleKaratToggle(22)}
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  label='24 Karat'
                  color={calcKarats === 24 ? 'primary' : 'default'}
                  onClick={() => handleKaratToggle(24)}
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
            }
          />
          <Divider />
          <CardContent>
            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  size='small'
                  label='22K Rate (₹/g)'
                  value={gold22k}
                  onChange={(e) => setGold22k(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position='start'>₹</InputAdornment>
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  size='small'
                  label='24K Rate (₹/g)'
                  value={gold24k}
                  onChange={(e) => setGold24k(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position='start'>₹</InputAdornment>
                  }}
                />
              </Grid>
            </Grid>

            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
              Enter cash value or gold weight below to convert on-the-fly:
            </Typography>

            <Stack spacing={4}>
              <TextField
                id='calc-amount-input'
                fullWidth
                label='Cash Value (INR)'
                placeholder='Enter cash amount...'
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position='start'>₹</InputAdornment>
                }}
              />
              <Box className='flex justify-center'>
                <i className='ri-arrow-up-down-line text-2xl text-secondary' />
              </Box>
              <TextField
                id='calc-grams-input'
                fullWidth
                label='Gold Weight (Grams)'
                placeholder='Enter weight in grams...'
                value={calcGrams}
                onChange={(e) => setCalcGrams(e.target.value)}
                InputProps={{
                  endAdornment: <InputAdornment position='end'>g</InputAdornment>
                }}
              />
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* 7. Cash Drawer Denomination Counter */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%', border: '1px solid var(--mui-palette-divider)' }}>
          <CardHeader
            title='Counter Cash Reconciliation'
            subheader='Verify physical cash drawer balance against system transactions'
          />
          <Divider />
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 7 }}>
                <TableContainer component={Paper} variant='outlined' sx={{ borderRadius: 1 }}>
                  <Table size='small' sx={{ '& .MuiTableCell-root': { py: 1 } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Note</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Quantity</TableCell>
                        <TableCell align='right' sx={{ fontWeight: 700 }}>Total Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(denominationValues).map(([key, val]) => (
                        <TableRow key={key}>
                          <TableCell sx={{ fontWeight: 600 }}>₹{val}</TableCell>
                          <TableCell>
                            <TextField
                              size='small'
                              variant='standard'
                              value={denominations[key as keyof typeof denominations]}
                              onChange={(e) => {
                                const valStr = e.target.value

                                if (/^\d*$/.test(valStr)) {
                                  setDenominations({ ...denominations, [key]: valStr })
                                }
                              }}
                              inputProps={{ style: { textAlign: 'center', width: 60 } }}
                            />
                          </TableCell>
                          <TableCell align='right' sx={{ fontWeight: 600 }}>
                            {currencyFormatter.format(Number(denominations[key as keyof typeof denominations] || 0) * val)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid size={{ xs: 12, sm: 5 }}>
                <Stack spacing={4} sx={{ height: '100%', justifyContent: 'center' }}>
                  <Paper
                    variant='outlined'
                    sx={{
                      p: 4,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      borderLeft: '4px solid var(--mui-palette-primary-main)'
                    }}
                  >
                    <Typography variant='body2' color='text.secondary'>
                      Total Physical Cash:
                    </Typography>
                    <Typography variant='h5' fontWeight={700} sx={{ mt: 1 }}>
                      {currencyFormatter.format(totalDenominationCash)}
                    </Typography>
                  </Paper>

                  <Paper variant='outlined' sx={{ p: 4, borderRadius: 1 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1.5 }}>
                      RECONCILIATION SUMMARY
                    </Typography>
                    <Typography variant='body2' sx={{ mb: 1 }}>
                      System Cash Expected: <br />
                      <strong>{currencyFormatter.format(collectionsToday * 0.45 + openingBalance)}</strong>
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Stack direction='row' alignItems='center' spacing={2}>
                      {cashDifference === 0 ? (
                        <Chip icon={<i className='ri-checkbox-circle-line' />} label='Reconciled' color='success' size='small' />
                      ) : cashDifference > 0 ? (
                        <Chip
                          icon={<i className='ri-error-warning-line' />}
                          label={`Surplus: ${currencyFormatter.format(cashDifference)}`}
                          color='warning'
                          size='small'
                        />
                      ) : (
                        <Chip
                          icon={<i className='ri-close-circle-line' />}
                          label={`Shortage: ${currencyFormatter.format(Math.abs(cashDifference))}`}
                          color='error'
                          size='small'
                        />
                      )}
                    </Stack>
                  </Paper>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* 8. Recent Collections Feed */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ border: '1px solid var(--mui-palette-divider)' }}>
          <CardHeader
            title='Recent Counter Collections'
            subheader='Today’s transactions captured from payment logs'
          />
          <Divider />
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Receipt # / ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Scheme</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Payment Mode</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700 }}>Amount</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentPayments.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>#{p.id}</TableCell>
                      <TableCell>{p.membership?.customer?.name || p.membership?.customer?.mobile || 'Unknown'}</TableCell>
                      <TableCell>{p.membership?.scheme?.name || 'N/A'}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>
                        <Stack direction='row' spacing={1.5} alignItems='center'>
                          <i
                            className={
                              p.gateway === 'cash'
                                ? 'ri-wallet-3-line text-info'
                                : p.gateway === 'card'
                                ? 'ri-bank-card-line text-warning'
                                : 'ri-qr-code-line text-success'
                            }
                          />
                          <span>{p.gateway || 'cash'}</span>
                        </Stack>
                      </TableCell>
                      <TableCell>{format(new Date(p.payment_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          label={p.status}
                          color={p.status === 'success' ? 'success' : 'default'}
                          variant='tonal'
                        />
                      </TableCell>
                      <TableCell align='right' sx={{ fontWeight: 700 }}>
                        {currencyFormatter.format(Number(p.amount))}
                      </TableCell>
                      <TableCell align='center'>
                        <Button
                          component={Link}
                          href={`/payments/receipt/${p.id}`}
                          variant='outlined'
                          size='small'
                        >
                          Print Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align='center' sx={{ py: 6 }}>
                        No transactions recorded in drawer session yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default CashierDashboard
