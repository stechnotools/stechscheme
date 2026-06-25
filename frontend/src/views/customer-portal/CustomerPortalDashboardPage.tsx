'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { customerPortalRequest } from '@/libs/customerPortal'

// "Aurelia" gold/dark palette — scoped to this dashboard only.
const PALETTE = {
  gold: '#C9A84C',
  goldLt: '#E2C46A',
  goldDk: '#9A7828',
  goldBg: '#FBF5E6',
  goldBg2: '#F5EDD4',
  dark: '#23190D',
  dark2: '#2E2115',
  ink: '#18120A',
  cream: '#F2E8D0',
  muted: '#7A6840',
  green: '#2D9A58',
  greenBg: '#EBF8F1',
  amber: '#C8730F',
  amberBg: '#FCEEDD',
  red: '#C0392B',
  redBg: '#FDECEA'
}

// Rotating deep jewel-tone gradients for "My Schemes" cards — stays within the
// warm gold/teal/rose palette (no cool indigo/purple) but gives each card its
// own colorful identity when a customer has multiple memberships.
const SCHEME_ACCENTS = [
  { gradient: 'linear-gradient(135deg, #9A7828 0%, #C9A84C 100%)', solid: '#C9A84C' },
  { gradient: 'linear-gradient(135deg, #0E5E6F 0%, #1B8A9E 100%)', solid: '#1B8A9E' },
  { gradient: 'linear-gradient(135deg, #8C2F39 0%, #C2485A 100%)', solid: '#C2485A' }
]

type PortalMembership = {
  id: number
  membership_no?: string | null
  card_no?: string | null
  card_reference?: string | null
  start_date: string
  maturity_date: string
  total_paid: string | number
  status: string
  scheme?: {
    name: string
    code: string
    maturityBenefits?: Array<{ id: number; month: number; type: string; value: string | number }>
  } | null
  installments?: Array<{ id: number; installment_no: number; due_date: string; amount: string | number; paid: boolean }>
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
  rate_per_unit: string
  effective_sell_rate: number
}

type DashboardResponse = {
  data: {
    customer: {
      name?: string | null
      mobile: string
      email?: string | null
      kyc?: { status?: string | null } | null
    }
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

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const daysUntil = (dateString?: string | null) => {
  if (!dateString) return null
  const diffMs = new Date(dateString).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)

  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

const greeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'

  return 'Good evening'
}

const statusBadge = (status: string) => {
  const normalized = status.toLowerCase()
  if (normalized === 'active') return { bg: PALETTE.greenBg, color: PALETTE.green, icon: 'ri-checkbox-circle-line', label: 'Active' }
  if (normalized === 'matured' || normalized === 'completed') return { bg: PALETTE.goldBg, color: PALETTE.goldDk, icon: 'ri-trophy-line', label: status }

  return { bg: PALETTE.redBg, color: PALETTE.red, icon: 'ri-time-line', label: status }
}

const CustomerPortalDashboardPage = () => {
  const [payload, setPayload] = useState<DashboardResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [goldRates, setGoldRates] = useState<GoldRate[]>([])

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

  useEffect(() => {
    const loadRates = async () => {
      try {
        const response = await customerPortalRequest<{ data: GoldRate[] }>('/customer-portal/gold-rate')
        setGoldRates(response.data)
      } catch {
        // Ticker is a nice-to-have — don't block the rest of the dashboard on it.
      }
    }

    void loadRates()
  }, [])

  if (loading && !payload) {
    return (
      <Stack alignItems='center' sx={{ mt: 8 }}>
        <CircularProgress sx={{ color: PALETTE.gold }} />
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

  const nextDueDays = daysUntil(payload.summary.next_due_date)
  const hasOverdue = payload.summary.overdue_installments_count > 0

  const totalInstallmentValueAcrossMemberships = payload.memberships.reduce(
    (sum, membership) => sum + (membership.installments || []).reduce((s, i) => s + Number(i.amount || 0), 0),
    0
  )
  const overallProgressPct =
    totalInstallmentValueAcrossMemberships > 0
      ? Math.min(100, Math.round((payload.summary.total_paid / totalInstallmentValueAcrossMemberships) * 100))
      : 0

  const heroRates = goldRates.slice(0, 2)

  const statItems = [
    {
      v: payload.summary.memberships_count,
      l: 'Schemes',
      icon: 'ri-gem-line',
      gradient: 'linear-gradient(135deg, #9A7828 0%, #C9A84C 100%)'
    },
    {
      v: payload.summary.active_memberships_count,
      l: 'Active',
      icon: 'ri-checkbox-circle-line',
      gradient: 'linear-gradient(135deg, #0F6B49 0%, #2D9A58 100%)'
    },
    {
      v: payload.summary.pending_installments_count,
      l: 'Pending',
      icon: 'ri-time-line',
      gradient: 'linear-gradient(135deg, #9A5A0F 0%, #C8730F 100%)'
    }
  ]

  return (
    <Box sx={{ p: { xs: 0, md: 4 }, bgcolor: { xs: '#F7F2E8', md: 'transparent' } }}>
      <Stack spacing={3}>
        {/* Hero */}
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            bgcolor: PALETTE.dark,
            borderRadius: { xs: 0, md: 3 },
            p: { xs: 3, md: 4 }
          }}
        >
          <Box sx={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(201,168,76,0.06)' }} />
          <Box sx={{ position: 'absolute', left: -20, bottom: -60, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(201,168,76,0.04)' }} />

          <Stack spacing={1.5} sx={{ position: 'relative' }}>
            <Chip
              size='small'
              icon={<i className='ri-vip-crown-2-line' style={{ fontSize: '0.85rem', color: PALETTE.goldLt }} />}
              label={`KYC ${payload.customer.kyc?.status || 'pending'}`}
              sx={{
                alignSelf: 'flex-start',
                bgcolor: 'rgba(201,168,76,0.14)',
                border: '1px solid rgba(201,168,76,0.25)',
                color: PALETTE.goldLt,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                fontSize: '0.65rem',
                height: 24
              }}
            />
            <Typography sx={{ color: PALETTE.cream, fontSize: { xs: '1.4rem', md: '1.6rem' }, fontWeight: 500, lineHeight: 1.2 }}>
              {greeting()},<br />
              {payload.customer.name || payload.customer.mobile}
            </Typography>
            <Typography sx={{ color: PALETTE.muted, fontSize: '0.8rem' }}>
              {payload.customer.mobile} · {payload.summary.active_memberships_count} active scheme{payload.summary.active_memberships_count === 1 ? '' : 's'}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, pt: 1.5 }}>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 2, p: 2 }}>
                <Stack direction='row' spacing={0.5} alignItems='center' sx={{ mb: 0.75 }}>
                  <i className='ri-wallet-3-line' style={{ fontSize: '0.85rem', color: PALETTE.muted }} />
                  <Typography sx={{ fontSize: '0.65rem', color: PALETTE.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Total Paid
                  </Typography>
                </Stack>
                <Typography sx={{ color: PALETTE.cream, fontSize: '1.4rem', fontWeight: 500, lineHeight: 1 }}>
                  {currencyFormatter.format(payload.summary.total_paid)}
                </Typography>
                <Stack direction='row' spacing={0.5} alignItems='center' sx={{ mt: 0.75, color: '#4DC97A' }}>
                  <i className='ri-arrow-up-line' style={{ fontSize: '0.75rem' }} />
                  <Typography sx={{ fontSize: '0.65rem' }}>{overallProgressPct}% complete</Typography>
                </Stack>
              </Box>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 2, p: 2 }}>
                <Stack direction='row' spacing={0.5} alignItems='center' sx={{ mb: 0.75 }}>
                  <i className={hasOverdue ? 'ri-alarm-warning-line' : 'ri-time-line'} style={{ fontSize: '0.85rem', color: PALETTE.muted }} />
                  <Typography sx={{ fontSize: '0.65rem', color: PALETTE.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {hasOverdue ? 'Overdue' : 'Next Due'}
                  </Typography>
                </Stack>
                <Typography sx={{ color: PALETTE.cream, fontSize: '1.4rem', fontWeight: 500, lineHeight: 1 }}>
                  {hasOverdue
                    ? `${payload.summary.overdue_installments_count}`
                    : nextDueDays !== null
                      ? `${nextDueDays}d`
                      : '—'}
                </Typography>
                <Stack direction='row' spacing={0.5} alignItems='center' sx={{ mt: 0.75, color: hasOverdue ? '#E07070' : PALETTE.muted }}>
                  <i className='ri-calendar-line' style={{ fontSize: '0.75rem' }} />
                  <Typography sx={{ fontSize: '0.65rem' }}>
                    {hasOverdue
                      ? `${payload.summary.overdue_installments_count > 1 ? 'installments' : 'installment'} overdue`
                      : payload.summary.next_due_date
                        ? new Date(payload.summary.next_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : 'None pending'}
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Stack>
        </Box>

        {error ? <Alert severity='warning' sx={{ mx: { xs: 2, md: 0 } }}>{error}</Alert> : null}

        {/* Stat cards — three distinct cards instead of one divided strip */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1.5,
            mx: { xs: 2, md: 0 }
          }}
        >
          {statItems.map(stat => (
            <Card
              key={stat.l}
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 2.5,
                background: stat.gradient,
                textAlign: 'center',
                transition: 'transform 0.15s, box-shadow 0.15s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
              }}
            >
              {/* Oversized faded icon as a decorative "background image" */}
              <i
                className={stat.icon}
                style={{
                  position: 'absolute',
                  right: -10,
                  bottom: -16,
                  fontSize: '5rem',
                  color: 'rgba(255,255,255,0.16)',
                  transform: 'rotate(-12deg)'
                }}
              />

              <Box sx={{ position: 'relative', py: 2.25, px: 1 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    mx: 'auto',
                    mb: 1,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.18)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <i className={stat.icon} style={{ fontSize: '1.1rem', color: '#fff' }} />
                </Box>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{stat.v}</Typography>
                <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.82)', textTransform: 'uppercase', letterSpacing: '0.4px', mt: 0.5 }}>
                  {stat.l}
                </Typography>
              </Box>
            </Card>
          ))}
        </Box>

        {/* Gold rate panel */}
        {heroRates.length > 0 && (
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              mx: { xs: 2, md: 0 },
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #7A5E1E 0%, #C9A84C 55%, #E2C46A 100%)',
              p: 2.25
            }}
          >
            <i
              className='ri-copper-coin-line'
              style={{
                position: 'absolute',
                right: -16,
                bottom: -22,
                fontSize: '6rem',
                color: 'rgba(255,255,255,0.14)',
                transform: 'rotate(-8deg)'
              }}
            />

            <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ position: 'relative' }}>
              <Stack direction='row' spacing={3} alignItems='center' divider={<Divider orientation='vertical' flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)' }} />}>
                {heroRates.map(rate => (
                  <Box key={rate.id}>
                    <Stack direction='row' spacing={0.5} alignItems='center'>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4DC97A' }} />
                      <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {rate.metal_name} {rate.purity}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                      {currencyFormatter.format(rate.effective_sell_rate)}
                      <Typography component='span' sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)' }}>/{rate.rate_per_unit}</Typography>
                    </Typography>
                  </Box>
                ))}
              </Stack>
              <Button
                component={Link}
                href='/customer/panel/gold-rate'
                size='small'
                variant='outlined'
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', flexShrink: 0, '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                endIcon={<i className='ri-arrow-right-s-line' />}
              >
                Chart
              </Button>
            </Stack>
          </Box>
        )}

        {/* Quick pay offer banner */}
        <Box
          component={Link}
          href='/customer/panel/pay'
          sx={{
            mx: { xs: 2, md: 0 },
            bgcolor: PALETTE.dark,
            borderRadius: 2,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.75,
            textDecoration: 'none'
          }}
        >
          <Box sx={{ width: 46, height: 46, borderRadius: '50%', bgcolor: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className='ri-flashlight-line' style={{ color: PALETTE.goldLt, fontSize: '1.3rem' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ color: PALETTE.cream, fontSize: '0.85rem', fontWeight: 500 }}>Quick Pay</Typography>
            <Typography sx={{ color: PALETTE.muted, fontSize: '0.7rem' }}>Pay any due installment in a few taps</Typography>
          </Box>
          <i className='ri-arrow-right-s-line' style={{ color: PALETTE.goldLt, fontSize: '1.2rem' }} />
        </Box>

        {hasOverdue && (
          <Alert severity='error' variant='filled' icon={<i className='ri-alarm-warning-line' />} sx={{ mx: { xs: 2, md: 0 } }}>
            {payload.summary.overdue_installments_count} installment{payload.summary.overdue_installments_count > 1 ? 's are' : ' is'} overdue. Please pay at your earliest convenience.
          </Alert>
        )}

        {/* My Schemes */}
        <Box sx={{ px: { xs: 2, md: 0 } }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: PALETTE.ink, mb: 1.5 }}>My Schemes</Typography>

          {payload.memberships.length ? (
            <Stack spacing={2}>
              {payload.memberships.map((membership, index) => {
                const totalInstallmentValue = (membership.installments || []).reduce(
                  (sum, installment) => sum + Number(installment.amount || 0),
                  0
                )
                const totalPaid = Number(membership.total_paid || 0)
                const progress = totalInstallmentValue > 0 ? Math.min(100, (totalPaid / totalInstallmentValue) * 100) : 0
                const nextInstallment = (membership.installments || []).find(i => !i.paid)
                const badge = statusBadge(membership.status)
                const accent = SCHEME_ACCENTS[index % SCHEME_ACCENTS.length]

                return (
                  <Card
                    key={membership.id}
                    sx={{
                      borderRadius: 2.5,
                      overflow: 'hidden',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 5 }
                    }}
                  >
                    {/* Colorful gradient header */}
                    <Box sx={{ position: 'relative', overflow: 'hidden', background: accent.gradient, p: 2 }}>
                      <i
                        className='ri-gem-line'
                        style={{
                          position: 'absolute',
                          right: -14,
                          bottom: -20,
                          fontSize: '5.5rem',
                          color: 'rgba(255,255,255,0.14)',
                          transform: 'rotate(-10deg)'
                        }}
                      />
                      <Stack direction='row' alignItems='center' spacing={1.5} sx={{ position: 'relative' }}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            bgcolor: 'rgba(255,255,255,0.18)',
                            border: '1px solid rgba(255,255,255,0.32)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <i className='ri-gem-line' style={{ color: '#fff', fontSize: '1.35rem' }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }} noWrap>
                            {membership.scheme?.name || `Membership #${membership.id}`}
                          </Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>
                            {membership.scheme?.code || 'No scheme code'} · {membership.membership_no || 'Pending'}
                          </Typography>
                        </Box>
                        <Chip
                          size='small'
                          icon={<i className={badge.icon} style={{ fontSize: '0.7rem', color: badge.color }} />}
                          label={badge.label}
                          sx={{ bgcolor: 'rgba(255,255,255,0.92)', color: badge.color, fontSize: '0.6rem', height: 22, textTransform: 'capitalize' }}
                        />
                      </Stack>
                    </Box>

                    {totalInstallmentValue > 0 && (
                      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                        <Stack direction='row' justifyContent='space-between' sx={{ mb: 0.5 }}>
                          <Typography sx={{ fontSize: '0.7rem', color: PALETTE.muted }}>
                            {(membership.installments || []).filter(i => i.paid).length} of {(membership.installments || []).length} installments
                          </Typography>
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: accent.solid }}>{Math.round(progress)}%</Typography>
                        </Stack>
                        <LinearProgress
                          variant='determinate'
                          value={progress}
                          sx={{
                            height: 7,
                            borderRadius: 4,
                            bgcolor: `${accent.solid}1f`,
                            '& .MuiLinearProgress-bar': { bgcolor: accent.solid, borderRadius: 4 }
                          }}
                        />
                      </Box>
                    )}

                    <Stack
                      direction='row'
                      alignItems='center'
                      justifyContent='space-between'
                      sx={{ px: 2, py: 1.5 }}
                    >
                      <Typography sx={{ fontSize: '0.75rem', color: PALETTE.muted }}>
                        {nextInstallment ? (
                          <>
                            Next: <Box component='span' sx={{ color: PALETTE.ink, fontWeight: 500 }}>
                              {currencyFormatter.format(Number(nextInstallment.amount || 0))} · {new Date(nextInstallment.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </Box>
                          </>
                        ) : (
                          'All installments paid'
                        )}
                      </Typography>
                      <Stack direction='row' spacing={1}>
                        {nextInstallment && (
                          <Button
                            component={Link}
                            href='/customer/panel/pay'
                            size='small'
                            sx={{ bgcolor: accent.solid, color: 'white', fontWeight: 600, '&:hover': { bgcolor: accent.solid, opacity: 0.88 } }}
                          >
                            Pay Now
                          </Button>
                        )}
                        <Button component={Link} href={`/customer/panel/memberships/${membership.id}`} size='small' variant='outlined' sx={{ color: PALETTE.muted, borderColor: 'divider' }}>
                          Details
                        </Button>
                      </Stack>
                    </Stack>
                  </Card>
                )
              })}
            </Stack>
          ) : (
            <Alert severity='info'>No memberships are available for this customer yet.</Alert>
          )}
        </Box>

        {/* Refer & earn offer banner */}
        <Box
          component={Link}
          href='/customer/panel/wallet'
          sx={{
            mx: { xs: 2, md: 0 },
            bgcolor: PALETTE.dark,
            borderRadius: 2,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.75,
            textDecoration: 'none'
          }}
        >
          <Box sx={{ width: 46, height: 46, borderRadius: '50%', bgcolor: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className='ri-gift-line' style={{ color: PALETTE.goldLt, fontSize: '1.3rem' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ color: PALETTE.cream, fontSize: '0.85rem', fontWeight: 500 }}>Refer a friend</Typography>
            <Typography sx={{ color: PALETTE.muted, fontSize: '0.7rem' }}>Share your code and track your rewards</Typography>
          </Box>
          <i className='ri-arrow-right-s-line' style={{ color: PALETTE.goldLt, fontSize: '1.2rem' }} />
        </Box>

        {/* Recent activity */}
        {payload.recent_payments.length > 0 && (
          <Box sx={{ px: { xs: 2, md: 0 }, pb: 2 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: PALETTE.ink, mb: 1.5 }}>Recent Activity</Typography>
            <Card variant='outlined' sx={{ borderRadius: 2 }}>
              <Stack divider={<Divider />}>
                {payload.recent_payments.map(payment => (
                  <Stack key={payment.id} direction='row' alignItems='center' spacing={1.5} sx={{ p: 1.75 }}>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        bgcolor: PALETTE.goldBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <i className='ri-arrow-up-line' style={{ color: PALETTE.red, fontSize: '1rem' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.8rem', color: PALETTE.ink }}>Installment paid</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: PALETTE.muted }}>
                        {new Date(payment.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {payment.gateway || 'manual'}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: PALETTE.red, whiteSpace: 'nowrap' }}>
                      −{currencyFormatter.format(Number(payment.amount || 0))}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Card>
          </Box>
        )}
      </Stack>
    </Box>
  )
}

export default CustomerPortalDashboardPage
