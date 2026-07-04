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

// Same "Regal" palette as the dashboard, kept in sync so cards look identical.
const PALETTE = {
  purple: '#241454',
  purpleDk: '#160B33',
  purpleLt: '#4B32A8',
  gold: '#C9A84C',
  goldLt: '#E2C46A',
  goldDk: '#9A7828',
  ink: '#1B1030',
  muted: '#71708A',
  bgPage: '#F6F5FB',
  green: '#16A34A',
  greenBg: '#E7F9EE',
  amberBg: '#FCEEDD',
  red: '#DC2626',
  redBg: '#FDECEA'
}

type PortalInstallment = { id: number; installment_no: number; due_date: string; amount: string | number; paid: boolean }

type PortalMembership = {
  id: number
  membership_no?: string | null
  start_date: string
  maturity_date: string
  total_paid: string | number
  status: string
  scheme?: { name: string; code: string } | null
  installments?: PortalInstallment[]
}

type DashboardResponse = { data: { memberships: PortalMembership[] } }

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

const statusBadge = (status: string) => {
  const normalized = status.toLowerCase()

  if (normalized === 'active') return { bg: PALETTE.greenBg, color: PALETTE.green, icon: 'ri-checkbox-circle-line', label: 'Active' }
  if (normalized === 'matured' || normalized === 'completed') return { bg: PALETTE.amberBg, color: PALETTE.goldDk, icon: 'ri-trophy-line', label: status }

  return { bg: PALETTE.redBg, color: PALETTE.red, icon: 'ri-time-line', label: status }
}

const CustomerPortalMySchemesPage = () => {
  const [memberships, setMemberships] = useState<PortalMembership[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    customerPortalRequest<DashboardResponse>('/customer-portal/dashboard')
      .then(response => setMemberships(response.data.memberships))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load your schemes.'))
  }, [])

  if (!memberships && !error) {
    return (
      <Stack alignItems='center' sx={{ mt: 8 }}>
        <CircularProgress sx={{ color: PALETTE.purple }} />
      </Stack>
    )
  }

  return (
    <Box sx={{ bgcolor: PALETTE.bgPage, minHeight: '100%', pb: 3 }}>
      <Stack spacing={2} sx={{ px: 2, pt: 2.5 }}>
        <Stack direction='row' alignItems='center' justifyContent='space-between'>
          <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, color: PALETTE.ink }}>My Schemes</Typography>
          <Button component={Link} href='/customer/panel/schemes' size='small' endIcon={<i className='ri-arrow-right-s-line' />} sx={{ color: PALETTE.purpleLt }}>
            Join New Scheme
          </Button>
        </Stack>

        {error ? <Alert severity='warning'>{error}</Alert> : null}

        {memberships && memberships.length === 0 ? (
          <Alert severity='info'>You haven&apos;t joined any scheme yet. Browse available schemes to get started.</Alert>
        ) : (
          memberships?.map(membership => {
            const totalInstallmentValue = (membership.installments || []).reduce((sum, i) => sum + Number(i.amount || 0), 0)
            const paid = Number(membership.total_paid || 0)
            const progress = totalInstallmentValue > 0 ? Math.min(100, (paid / totalInstallmentValue) * 100) : 0
            const nextInstallment = (membership.installments || []).find(i => !i.paid)
            const remaining = (membership.installments || []).filter(i => !i.paid).length
            const paidCount = (membership.installments || []).filter(i => i.paid).length
            const badge = statusBadge(membership.status)

            return (
              <Card key={membership.id} sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: PALETTE.purpleDk }}>
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
                        {membership.scheme?.name || `Membership #${membership.id}`}
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                        {membership.membership_no || 'Pending'}
                      </Typography>
                    </Box>
                    <Chip
                      size='small'
                      icon={<i className={badge.icon} style={{ fontSize: '0.7rem', color: badge.color }} />}
                      label={badge.label}
                      sx={{ bgcolor: 'rgba(255,255,255,0.92)', color: badge.color, fontSize: '0.6rem', height: 22, textTransform: 'capitalize' }}
                    />
                  </Stack>

                  {totalInstallmentValue > 0 && (
                    <Box sx={{ position: 'relative', mb: 2 }}>
                      <Stack direction='row' justifyContent='space-between' sx={{ mb: 0.5 }}>
                        <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                          {paidCount} / {(membership.installments || []).length} Paid
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: PALETTE.goldLt }}>{Math.round(progress)}%</Typography>
                      </Stack>
                      <LinearProgress
                        variant='determinate'
                        value={progress}
                        sx={{ height: 7, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.12)', '& .MuiLinearProgress-bar': { bgcolor: PALETTE.gold, borderRadius: 4 } }}
                      />
                    </Box>
                  )}

                  <Stack direction='row' justifyContent='space-between' sx={{ position: 'relative', mb: 2 }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)' }}>Paid Amount</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{currencyFormatter.format(paid)}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)' }}>Total Amount</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{currencyFormatter.format(totalInstallmentValue)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)' }}>Remaining</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: PALETTE.goldLt }}>
                        {remaining > 0 ? `${remaining} left` : 'Complete'}
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1.5 }} />

                  <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ position: 'relative' }}>
                    <Stack direction='row' spacing={0.75} alignItems='center'>
                      <i className='ri-calendar-event-line' style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem' }} />
                      <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>
                        {nextInstallment
                          ? `Next Due: ${new Date(nextInstallment.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : 'All installments paid'}
                      </Typography>
                    </Stack>
                    {nextInstallment && (
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
            )
          })
        )}
      </Stack>
    </Box>
  )
}

export default CustomerPortalMySchemesPage
