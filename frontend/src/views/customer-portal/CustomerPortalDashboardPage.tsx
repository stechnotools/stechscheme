'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { customerPortalRequest, resolveCustomerAssetUrl } from '@/libs/customerPortal'

// "Regal" purple/gold palette — scoped to this dashboard only.
const PALETTE = {
  purple: '#241454',
  purpleDk: '#160B33',
  purpleLt: '#4B32A8',
  purpleSoft: '#EFEAFB',
  gold: '#C9A84C',
  goldLt: '#E2C46A',
  goldDk: '#9A7828',
  ink: '#1B1030',
  muted: '#71708A',
  bgPage: '#F6F5FB',
  green: '#16A34A',
  greenBg: '#E7F9EE',
  amber: '#C8730F',
  amberBg: '#FCEEDD',
  red: '#DC2626',
  redBg: '#FDECEA',
  teal: '#0D9488',
  tealBg: '#E1F6F3',
  blue: '#2563EB',
  blueBg: '#E8EFFD',
  pink: '#DB2777',
  pinkBg: '#FCE7F3'
}

const OFFERS_POPUP_SEEN_KEY = 'customer_offers_popup_seen'

type PortalInstallment = { id: number; installment_no: number; due_date: string; amount: string | number; paid: boolean }

type PortalMembership = {
  id: number
  membership_no?: string | null
  card_no?: string | null
  card_reference?: string | null
  start_date: string
  maturity_date: string
  total_paid: string | number
  status: string
  scheme?: { name: string; code: string } | null
  installments?: PortalInstallment[]
}

type RecentPayment = {
  id: number
  amount: string | number
  payment_date: string
  status: string
  gateway?: string | null
}

type GoldRate = {
  id: number
  metal_name: string
  purity: string
  display_text?: string | null
  rate_per_unit: string
  effective_sell_rate: number
}

type GoldRateHistoryPoint = { date: string; rate: number }

type WalletSummary = {
  referral_code: string | null
  points_balance: number
  lifetime_points: number
}

type CatalogProduct = { id: number; name: string; category?: string | null; price: string | number; image?: string | null }

type DashboardResponse = {
  data: {
    customer: { name?: string | null; mobile: string; email?: string | null; kyc?: { status?: string | null } | null }
    summary: {
      memberships_count: number
      active_memberships_count: number
      total_paid: number
      pending_installments_count: number
      overdue_installments_count: number
      next_due_date?: string | null
      latest_payment_date?: string | null
    }
    memberships: PortalMembership[]
    recent_payments: RecentPayment[]
  }
}

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

const statusBadge = (status: string) => {
  const normalized = status.toLowerCase()

  if (normalized === 'active') return { bg: PALETTE.greenBg, color: PALETTE.green, icon: 'ri-checkbox-circle-line', label: 'Active' }
  if (normalized === 'matured' || normalized === 'completed') return { bg: PALETTE.amberBg, color: PALETTE.goldDk, icon: 'ri-trophy-line', label: status }

  return { bg: PALETTE.redBg, color: PALETTE.red, icon: 'ri-time-line', label: status }
}

// Pick the membership most relevant to surface on the dashboard: an active
// one with the soonest unpaid installment, falling back to the first record.
const pickFeaturedMembership = (memberships: PortalMembership[]) => {
  const active = memberships.filter(m => m.status.toLowerCase() === 'active')
  const pool = active.length ? active : memberships

  return [...pool].sort((a, b) => {
    const aNext = (a.installments || []).find(i => !i.paid)?.due_date
    const bNext = (b.installments || []).find(i => !i.paid)?.due_date

    if (!aNext) return 1
    if (!bNext) return -1

    return new Date(aNext).getTime() - new Date(bNext).getTime()
  })[0]
}

const QUICK_ACTIONS = [
  { label: 'Pay Installment', href: '/customer/panel/pay', icon: 'ri-bank-card-line', gradient: `linear-gradient(135deg, ${PALETTE.purpleLt} 0%, ${PALETTE.purple} 100%)` },
  { label: 'Join New Scheme', href: '/customer/panel/schemes', icon: 'ri-add-circle-line', gradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)' },
  { label: 'Payment History', href: '/customer/panel/pay', icon: 'ri-file-list-3-line', gradient: 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)' },
  { label: 'Offers & Rewards', href: '/customer/panel/wallet', icon: 'ri-gift-line', gradient: `linear-gradient(135deg, ${PALETTE.goldLt} 0%, ${PALETTE.goldDk} 100%)` },
  { label: 'Store Locator', href: '/customer/panel/store-locator', icon: 'ri-map-pin-line', gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' },
  { label: 'Calculator', href: '/customer/panel/gold-rate', icon: 'ri-calculator-line', gradient: 'linear-gradient(135deg, #A78BFA 0%, #6D28D9 100%)' }
]

const CustomerPortalDashboardPage = () => {
  const [payload, setPayload] = useState<DashboardResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [goldRates, setGoldRates] = useState<GoldRate[]>([])
  const [rateChanges, setRateChanges] = useState<Record<number, { amount: number; pct: number }>>({})
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<Date | null>(null)
  const [refreshingRates, setRefreshingRates] = useState(false)
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [showOffersPopup, setShowOffersPopup] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await customerPortalRequest<DashboardResponse>('/customer-portal/dashboard')

        setPayload(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customer panel.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const loadGoldRates = () => {
    setRefreshingRates(true)

    return customerPortalRequest<{ data: GoldRate[] }>('/customer-portal/gold-rate')
      .then(response => {
        setGoldRates(response.data)
        setRatesUpdatedAt(new Date())
      })
      .catch(() => {
        // Ticker is a nice-to-have — don't block the rest of the dashboard on it.
      })
      .finally(() => setRefreshingRates(false))
  }

  useEffect(() => {
    void loadGoldRates()

    customerPortalRequest<{ data: WalletSummary }>('/customer-portal/wallet')
      .then(response => setWallet(response.data))
      .catch(() => {
        // Loyalty card is a nice-to-have here — the wallet page is the source of truth.
      })

    customerPortalRequest<{ data: CatalogProduct[] }>('/customer-portal/catalog?page=1')
      .then(response => setProducts(response.data.slice(0, 8)))
      .catch(() => {
        // Offer strip is optional — skip silently if the catalog is empty/unreachable.
      })
  }, [])

  // Surface the offers as a one-time popup on the customer's first visit —
  // subsequent dashboard loads only show the inline "Exclusive Offers" strip.
  useEffect(() => {
    if (!products.length) return
    if (window.localStorage.getItem(OFFERS_POPUP_SEEN_KEY)) return

    setShowOffersPopup(true)
    window.localStorage.setItem(OFFERS_POPUP_SEEN_KEY, '1')
  }, [products])

  useEffect(() => {
    if (!goldRates.length) return

    goldRates.forEach(rate => {
      customerPortalRequest<{ data: { history: GoldRateHistoryPoint[] } }>(`/customer-portal/gold-rate/history?master_id=${rate.id}`)
        .then(response => {
          const hist = response.data.history

          if (hist.length < 2) return
          const latest = hist[hist.length - 1].rate
          const previous = hist[hist.length - 2].rate

          setRateChanges(prev => ({
            ...prev,
            [rate.id]: { amount: latest - previous, pct: previous !== 0 ? ((latest - previous) / previous) * 100 : 0 }
          }))
        })
        .catch(() => {
          // Trend badge is decorative — the live rate itself still renders without it.
        })
    })
  }, [goldRates])

  if (loading && !payload) {
    return (
      <Stack alignItems='center' sx={{ mt: 8 }}>
        <CircularProgress sx={{ color: PALETTE.purple }} />
      </Stack>
    )
  }

  if (!payload) {
    return (
      <Stack sx={{ minHeight: '100vh', p: 4 }}>
        <Alert severity='error'>{error || 'Customer data not found.'}</Alert>
      </Stack>
    )
  }

  const hasOverdue = payload.summary.overdue_installments_count > 0
  // Show gold purities in the order customers expect to scan them (24K, then
  // 22K, then 18K), falling back to server order for anything unrecognized.
  const karatRank = (rate: GoldRate) => {
    const label = `${rate.purity} ${rate.display_text || ''}`
    if (/24\s*k/i.test(label)) return 0
    if (/22\s*k/i.test(label)) return 1
    if (/18\s*k/i.test(label)) return 2

    return 3
  }
  const displayedGoldRates = goldRates
    .filter(rate => rate.metal_name.toLowerCase() === 'gold')
    .sort((a, b) => karatRank(a) - karatRank(b))
    .slice(0, 3)
  const featured = payload.memberships.length ? pickFeaturedMembership(payload.memberships) : null
  const otherMembershipsCount = payload.memberships.length ? payload.memberships.length - 1 : 0

  // Catalog is ordered by id desc server-side, so the first product is the latest one.
  const featuredProduct = products[0] || null

  const nextDueAmount = payload.summary.next_due_date
    ? payload.memberships
        .flatMap(m => m.installments || [])
        .filter(i => !i.paid && new Date(i.due_date).toDateString() === new Date(payload.summary.next_due_date!).toDateString())
        .reduce((sum, i) => sum + Number(i.amount || 0), 0)
    : 0

  const statItems = [
    {
      v: currencyFormatter.format(payload.summary.total_paid),
      l: 'Total Invested',
      icon: 'ri-wallet-3-line',
      bg: PALETTE.purpleSoft,
      gradient: `linear-gradient(135deg, ${PALETTE.purpleLt} 0%, ${PALETTE.purple} 100%)`
    },
    {
      v: String(payload.summary.active_memberships_count),
      l: 'Active Schemes',
      icon: 'ri-store-2-line',
      bg: PALETTE.pinkBg,
      gradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)'
    },
    {
      v: payload.summary.next_due_date
        ? new Date(payload.summary.next_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : '—',
      sub: nextDueAmount > 0 ? currencyFormatter.format(nextDueAmount) : undefined,
      l: 'Next Due',
      icon: 'ri-calendar-line',
      bg: PALETTE.amberBg,
      gradient: `linear-gradient(135deg, ${PALETTE.goldLt} 0%, ${PALETTE.goldDk} 100%)`
    },
    {
      v: wallet ? wallet.points_balance.toLocaleString('en-IN') : '—',
      l: 'Loyalty Points',
      icon: 'ri-medal-line',
      bg: PALETTE.tealBg,
      gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D6E63 100%)'
    }
  ]

  const featuredTotalInstallmentValue = featured ? (featured.installments || []).reduce((sum, i) => sum + Number(i.amount || 0), 0) : 0
  const featuredPaid = featured ? Number(featured.total_paid || 0) : 0
  const featuredProgress = featuredTotalInstallmentValue > 0 ? Math.min(100, (featuredPaid / featuredTotalInstallmentValue) * 100) : 0
  const featuredNextInstallment = featured ? (featured.installments || []).find(i => !i.paid) : undefined
  const featuredRemaining = featured ? (featured.installments || []).filter(i => !i.paid).length : 0
  const featuredPaidCount = featured ? (featured.installments || []).filter(i => i.paid).length : 0
  const featuredBadge = featured ? statusBadge(featured.status) : null

  return (
    <Box sx={{ bgcolor: PALETTE.bgPage, minHeight: '100%' }}>
      <Stack spacing={3} sx={{ pb: 3, pt: 2 }}>
        {error ? <Alert severity='warning' sx={{ mx: 2 }}>{error}</Alert> : null}

        {/* Live gold rate hero */}
        {displayedGoldRates.length > 0 && (
          <Box sx={{ px: 2 }}>
            <Box
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 3,
                backgroundImage: 'url(/images/pwa/gold-rate-banner.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {/* Darkens the banner so the rate rows stay legible over the gold-bar
                  photograph at any card width. */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(100deg, ${PALETTE.purpleDk}F2 0%, ${PALETTE.purpleDk}DE 55%, ${PALETTE.purpleDk}AD 100%)`
                }}
              />

              <Stack spacing={1.75} sx={{ position: 'relative', p: 2.25 }}>
                <Stack direction='row' alignItems='center' justifyContent='space-between'>
                  <Stack direction='row' spacing={0.75} alignItems='center'>
                    <Chip
                      size='small'
                      label='LIVE'
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        letterSpacing: '0.4px',
                        color: PALETTE.purpleDk,
                        bgcolor: PALETTE.gold,
                        '& .MuiChip-label': { px: 0.9 }
                      }}
                    />
                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
                      Gold Rate · per gram
                    </Typography>
                  </Stack>

                  <Box
                    component='button'
                    type='button'
                    onClick={() => void loadGoldRates()}
                    aria-label='Refresh gold rate'
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: 'none', background: 'transparent', p: 0, cursor: 'pointer' }}
                  >
                    <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>
                      {ratesUpdatedAt
                        ? `Updated ${ratesUpdatedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                        : 'Updating…'}
                    </Typography>
                    {refreshingRates ? (
                      <CircularProgress size={11} sx={{ color: PALETTE.goldLt }} />
                    ) : (
                      <i className='ri-refresh-line' style={{ fontSize: '0.8rem', color: PALETTE.goldLt }} />
                    )}
                  </Box>
                </Stack>

                <Stack spacing={1}>
                  {displayedGoldRates.map((rate, idx) => {
                    const change = rateChanges[rate.id]
                    const label = rate.purity || rate.display_text || rate.metal_name
                    const subLabel = rate.display_text && rate.display_text !== rate.purity ? rate.display_text : null

                    return (
                      <Stack
                        key={rate.id}
                        direction='row'
                        alignItems='center'
                        justifyContent='space-between'
                        sx={{
                          pb: idx < displayedGoldRates.length - 1 ? 1 : 0,
                          borderBottom: idx < displayedGoldRates.length - 1 ? '1px solid rgba(255,255,255,0.12)' : 'none'
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{label}</Typography>
                          {subLabel && (
                            <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.55)' }}>{subLabel}</Typography>
                          )}
                        </Box>

                        <Stack alignItems='flex-end' spacing={0.25}>
                          <Typography sx={{ fontSize: '0.98rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                            {currencyFormatter.format(rate.effective_sell_rate)}
                          </Typography>
                          {change && (
                            <Stack direction='row' spacing={0.3} alignItems='center'>
                              <i
                                className={change.amount >= 0 ? 'ri-arrow-up-line' : 'ri-arrow-down-line'}
                                style={{ fontSize: '0.6rem', color: change.amount >= 0 ? '#4ADE80' : '#F87171' }}
                              />
                              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: change.amount >= 0 ? '#4ADE80' : '#F87171' }}>
                                {Math.abs(change.pct).toFixed(2)}%
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                      </Stack>
                    )
                  })}
                </Stack>

                <Stack direction='row' spacing={1.25}>
                  <Button
                    component={Link}
                    href='/customer/panel/schemes'
                    fullWidth
                    size='small'
                    startIcon={<i className='ri-shopping-bag-3-line' />}
                    sx={{ bgcolor: PALETTE.gold, color: PALETTE.purpleDk, fontWeight: 700, '&:hover': { bgcolor: PALETTE.goldLt } }}
                  >
                    Buy Digi Gold
                  </Button>
                  <Button
                    component={Link}
                    href='/customer/panel/gold-rate'
                    fullWidth
                    size='small'
                    variant='outlined'
                    startIcon={<i className='ri-line-chart-line' />}
                    sx={{
                      borderColor: 'rgba(255,255,255,0.4)',
                      color: '#fff',
                      fontWeight: 700,
                      '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' }
                    }}
                  >
                    Price History
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Box>
        )}

        {/* Stat grid */}
        <Box sx={{ px: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
            {statItems.map(stat => (
              <Card
                key={stat.l}
                variant='outlined'
                sx={{
                  textAlign: 'center',
                  py: 1.75,
                  px: 0.5,
                  borderRadius: 2.5,
                  borderColor: 'divider',
                  bgcolor: stat.bg
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    mx: 'auto',
                    mb: 0.75,
                    borderRadius: '50%',
                    background: stat.gradient,
                    boxShadow: '0 3px 8px rgba(0,0,0,0.16)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className={stat.icon} style={{ fontSize: '0.9rem', color: '#fff' }} />
                </Box>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: PALETTE.ink, lineHeight: 1.2 }}>{stat.v}</Typography>
                {stat.sub && <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: PALETTE.amber }}>{stat.sub}</Typography>}
                <Typography sx={{ fontSize: '0.6rem', color: PALETTE.muted, mt: 0.25 }}>{stat.l}</Typography>
              </Card>
            ))}
          </Box>
        </Box>

        {hasOverdue && (
          <Box sx={{ px: 2 }}>
            <Alert severity='error' variant='filled' icon={<i className='ri-alarm-warning-line' />}>
              {payload.summary.overdue_installments_count} installment{payload.summary.overdue_installments_count > 1 ? 's are' : ' is'} overdue. Please pay at your earliest convenience.
            </Alert>
          </Box>
        )}

        {/* My Active Scheme */}
        <Box sx={{ px: 2 }}>
          <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: PALETTE.ink }}>My Active Scheme</Typography>
            <Button component={Link} href='/customer/panel/my-schemes' size='small' endIcon={<i className='ri-arrow-right-s-line' />} sx={{ color: PALETTE.purpleLt }}>
              View All
            </Button>
          </Stack>

          {featured ? (
            <Card sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: PALETTE.purpleDk }}>
              <Box sx={{ position: 'relative', overflow: 'hidden', p: 2.25 }}>
                <i
                  className='ri-gem-line'
                  style={{ position: 'absolute', right: -14, bottom: -18, fontSize: '6rem', color: 'rgba(255,255,255,0.05)', transform: 'rotate(-10deg)' }}
                />

                <Stack direction='row' spacing={1.5} alignItems='center' sx={{ position: 'relative', mb: 2 }}>
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: '14px',
                      bgcolor: 'rgba(201,168,76,0.16)',
                      border: '1px solid rgba(201,168,76,0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <i className='ri-gem-line' style={{ color: PALETTE.goldLt, fontSize: '1.4rem' }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }} noWrap>
                      {featured.scheme?.name || `Membership #${featured.id}`}
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                      {featured.membership_no || 'Pending'}
                    </Typography>
                  </Box>
                  {featuredBadge && (
                    <Chip
                      size='small'
                      icon={<i className={featuredBadge.icon} style={{ fontSize: '0.7rem', color: featuredBadge.color }} />}
                      label={featuredBadge.label}
                      sx={{ bgcolor: 'rgba(255,255,255,0.92)', color: featuredBadge.color, fontSize: '0.6rem', height: 22, textTransform: 'capitalize' }}
                    />
                  )}
                </Stack>

                {featuredTotalInstallmentValue > 0 && (
                  <Box sx={{ position: 'relative', mb: 2 }}>
                    <Stack direction='row' justifyContent='space-between' sx={{ mb: 0.5 }}>
                      <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                        {featuredPaidCount} / {(featured.installments || []).length} Paid
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: PALETTE.goldLt }}>{Math.round(featuredProgress)}%</Typography>
                    </Stack>
                    <LinearProgress
                      variant='determinate'
                      value={featuredProgress}
                      sx={{ height: 7, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.12)', '& .MuiLinearProgress-bar': { bgcolor: PALETTE.gold, borderRadius: 4 } }}
                    />
                  </Box>
                )}

                <Stack direction='row' justifyContent='space-between' sx={{ position: 'relative', mb: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)' }}>Paid Amount</Typography>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{currencyFormatter.format(featuredPaid)}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)' }}>Total Amount</Typography>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{currencyFormatter.format(featuredTotalInstallmentValue)}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)' }}>Remaining</Typography>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: PALETTE.goldLt }}>
                      {featuredRemaining > 0 ? `${featuredRemaining} left` : 'Complete'}
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1.5 }} />

                <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ position: 'relative' }}>
                  <Stack direction='row' spacing={0.75} alignItems='center'>
                    <i className='ri-calendar-event-line' style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem' }} />
                    <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>
                      {featuredNextInstallment
                        ? `Next Due: ${new Date(featuredNextInstallment.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : 'All installments paid'}
                    </Typography>
                  </Stack>
                  {featuredNextInstallment && (
                    <Button
                      component={Link}
                      href='/customer/panel/pay'
                      size='small'
                      sx={{ bgcolor: PALETTE.gold, color: PALETTE.purpleDk, fontWeight: 700, px: 2.5, '&:hover': { bgcolor: PALETTE.goldLt } }}
                    >
                      Pay Now
                    </Button>
                  )}
                </Stack>
              </Box>
            </Card>
          ) : (
            <Alert severity='info'>No memberships are available for this customer yet.</Alert>
          )}

          {otherMembershipsCount > 0 && (
            <Typography sx={{ fontSize: '0.72rem', color: PALETTE.muted, mt: 1 }}>
              +{otherMembershipsCount} more scheme{otherMembershipsCount > 1 ? 's' : ''} —{' '}
              <Link href='/customer/panel/my-schemes' style={{ color: PALETTE.purpleLt, fontWeight: 600 }}>
                view all
              </Link>
            </Typography>
          )}
        </Box>

        {/* Quick Actions */}
        <Box sx={{ px: 2 }}>
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: PALETTE.ink, mb: 1.5 }}>Quick Actions</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${QUICK_ACTIONS.length}, 1fr)`, justifyItems: 'center' }}>
            {QUICK_ACTIONS.map(action => (
              <Box
                key={action.label}
                component={Link}
                href={action.href}
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', gap: 0.6 }}
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: action.gradient,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className={action.icon} style={{ color: '#fff', fontSize: '1.15rem' }} />
                </Box>
                <Typography sx={{ fontSize: '0.58rem', color: PALETTE.ink, textAlign: 'center', lineHeight: 1.2 }}>{action.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Exclusive making-charge offer banner */}
        <Box sx={{ px: 2 }}>
          <Box
            component={Link}
            href='/customer/panel/catalog'
            sx={{ display: 'block', borderRadius: 3, overflow: 'hidden', lineHeight: 0 }}
          >
            <Box
              component='img'
              src='/images/pwa/offer-banner.png'
              alt='Exclusive Offer for You — 10% extra value on making charges of gold jewellery, limited time offer'
              sx={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </Box>
        </Box>

        {/* Explore the catalog */}
        {products.length > 0 && (
          <Box sx={{ pl: 2 }}>
            <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 1.5, pr: 2 }}>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: PALETTE.ink }}>Exclusive Offers for You</Typography>
              <Button component={Link} href='/customer/panel/catalog' size='small' endIcon={<i className='ri-arrow-right-s-line' />} sx={{ color: PALETTE.purpleLt, flexShrink: 0 }}>
                View All
              </Button>
            </Stack>
            <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1, pr: 2, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
              {products.map(product => (
                <Card
                  key={product.id}
                  component={Link}
                  href={`/customer/panel/catalog/${product.id}`}
                  sx={{ minWidth: 148, maxWidth: 148, borderRadius: 2.5, textDecoration: 'none', flexShrink: 0 }}
                  variant='outlined'
                >
                  {product.image ? (
                    <Box component='img' src={resolveCustomerAssetUrl(product.image)} alt={product.name} sx={{ width: '100%', height: 110, objectFit: 'cover' }} />
                  ) : (
                    <Box sx={{ width: '100%', height: 110, bgcolor: PALETTE.purpleSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className='ri-gem-line' style={{ fontSize: '2rem', color: PALETTE.purpleLt, opacity: 0.6 }} />
                    </Box>
                  )}
                  <Box sx={{ p: 1.25 }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: PALETTE.ink }} noWrap>
                      {product.name}
                    </Typography>
                    {product.category && (
                      <Typography sx={{ fontSize: '0.6rem', color: PALETTE.muted }} noWrap>
                        {product.category}
                      </Typography>
                    )}
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: PALETTE.purpleLt, mt: 0.25 }}>
                      {currencyFormatter.format(Number(product.price || 0))}
                    </Typography>
                  </Box>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {/* Refer & Earn / Loyalty Rewards */}
        <Box sx={{ px: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Card
            component={Link}
            href='/customer/panel/wallet'
            sx={{ borderRadius: 2.5, bgcolor: PALETTE.purple, p: 2, color: '#fff', textDecoration: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <i className='ri-gift-2-line' style={{ fontSize: '1.5rem', color: PALETTE.goldLt }} />
            <Box sx={{ mt: 1.5 }}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>Refer &amp; Earn</Typography>
              <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', mt: 0.25 }}>
                {wallet?.referral_code ? `Share code ${wallet.referral_code}` : 'Share your code with friends'}
              </Typography>
            </Box>
          </Card>
          <Card
            component={Link}
            href='/customer/panel/wallet'
            sx={{ borderRadius: 2.5, bgcolor: PALETTE.amberBg, p: 2, textDecoration: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <i className='ri-vip-crown-2-line' style={{ fontSize: '1.5rem', color: PALETTE.goldDk }} />
            <Box sx={{ mt: 1.5 }}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: PALETTE.ink }}>Loyalty Rewards</Typography>
              <Typography sx={{ fontSize: '0.65rem', color: PALETTE.muted, mt: 0.25 }}>
                {wallet ? `You have ${wallet.points_balance.toLocaleString('en-IN')} points` : 'Redeem your points'}
              </Typography>
            </Box>
          </Card>
        </Box>

      </Stack>

      <Dialog open={showOffersPopup} onClose={() => setShowOffersPopup(false)} maxWidth='xs' fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', bgcolor: 'transparent' } }}>
        {featuredProduct && (
          <Box sx={{ position: 'relative' }}>
            <IconButton
              onClick={() => setShowOffersPopup(false)}
              aria-label='Close'
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                zIndex: 1,
                color: '#fff',
                bgcolor: 'rgba(0,0,0,0.35)',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' }
              }}
            >
              <i className='ri-close-line' style={{ fontSize: '1.2rem' }} />
            </IconButton>

            <Box
              component={Link}
              href={`/customer/panel/catalog/${featuredProduct.id}`}
              sx={{ display: 'block', textDecoration: 'none' }}
            >
              {featuredProduct.image ? (
                <Box
                  component='img'
                  src={resolveCustomerAssetUrl(featuredProduct.image)}
                  alt={featuredProduct.name}
                  sx={{ width: '100%', height: 420, objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: 420,
                    background: `linear-gradient(135deg, ${PALETTE.purpleDk} 0%, ${PALETTE.purple} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className='ri-gem-line' style={{ fontSize: '3.5rem', color: PALETTE.goldLt, opacity: 0.6 }} />
                </Box>
              )}

              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  p: 2.5,
                  pt: 5,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)'
                }}
              >
                <Typography sx={{ fontSize: '0.65rem', color: PALETTE.goldLt, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Just For You
                </Typography>
                <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', mt: 0.25 }} noWrap>
                  {featuredProduct.name}
                </Typography>
                <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mt: 0.5 }}>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: PALETTE.goldLt }}>
                    {currencyFormatter.format(Number(featuredProduct.price || 0))}
                  </Typography>
                  <Stack direction='row' spacing={0.5} alignItems='center' sx={{ color: '#fff' }}>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 600 }}>View Details</Typography>
                    <i className='ri-arrow-right-s-line' />
                  </Stack>
                </Stack>
              </Box>
            </Box>
          </Box>
        )}
      </Dialog>
    </Box>
  )
}

export default CustomerPortalDashboardPage
