'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'


import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import LinearProgress from '@mui/material/LinearProgress'
import Divider from '@mui/material/Divider'

type MembershipDetail = {
  id: number
  membership_no?: string | null
  card_no?: string | null
  card_reference?: string | null
  card_issued_at?: string | null
  customer_id: number
  scheme_id: number
  user_id?: number | null
  start_date: string
  maturity_date: string
  total_paid: string | number
  status: string
  customer?: {
    id: number
    name?: string | null
    mobile: string
    email?: string | null
    category?: string | null
    kyc?: { status?: string | null } | null
  } | null
  scheme?: {
    id: number
    name: string
    code: string
    installment_value?: string | number | null
    total_installments?: number | null
    free_installments?: number | null
    scheme_type?: string | null
    benefit_type?: string | null
    benefit_mode?: string | null
    min_installment_value?: string | number | null
  } | null
  installments?: Array<{
    id: number
    installment_no: number
    due_date: string
    paid: boolean
    amount?: string | number
    penalty?: string | number
    paid_date?: string | null
  }>
  payments?: Array<{
    id: number
    amount: string | number
    payment_date: string
    status: string
    gateway?: string | null
    transaction_id?: string | null
    installment?: { installment_no: number } | null
    receipt_id?: number | null
    receipt?: {
      id: number
      receipt_no: string
      payment_date: string
      gateway?: string | null
      transaction_id?: string | null
      status: string
    } | null
  }>
}

type MembershipResponse = { data: MembershipDetail }



const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
})

const getStatusColor = (status: string) => {
  const s = status.toLowerCase()

  if (s === 'active' || s === 'success') return 'success'
  if (s === 'pending' || s === 'paused' || s === 'matured') return 'warning'
  if (s === 'refunded' || s === 'redeemed' || s === 'settled') return 'info'
  
return 'error'
}

const getHeaderBackground = (status: string) => {
  const s = status.toLowerCase()

  if (s === 'active') return 'linear-gradient(135deg, #0f172a 0%, #059669 55%, #059669 100%)'
  if (s === 'paused') return 'linear-gradient(135deg, #0f172a 0%, #d97706 55%, #d97706 100%)'
  if (s === 'completed' || s === 'matured') return 'linear-gradient(135deg, #0f172a 0%, #b91c1c 55%, #ea580c 100%)'
  if (s === 'redeemed') return 'linear-gradient(135deg, #0f172a 0%, #06b6d4 55%, #3b82f6 100%)'
  if (s === 'cancelled' || s === 'closed') return 'linear-gradient(135deg, #0f172a 0%, #475569 55%, #64748b 100%)'
  if (s === 'settled') return 'linear-gradient(135deg, #0f172a 0%, #6d28d9 55%, #8b5cf6 100%)'
  
return 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #0f766e 100%)'
}



import Skeleton from '@mui/material/Skeleton'

const MembershipDetailSkeleton = () => (
  <Grid container spacing={6}>
    {/* Header Banner Skeleton */}
    <Grid size={{ xs: 12 }}>
      <Skeleton variant='rectangular' height={220} sx={{ borderRadius: 2 }} />
    </Grid>

    {/* Stats Cards Skeletons */}
    {[1, 2, 3, 4].map(i => (
      <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
        <Card sx={{ height: '100%', p: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Stack direction='row' justifyContent='space-between' alignItems='center'>
            <Box sx={{ width: '60%' }}>
              <Skeleton variant='text' width='80%' height={20} />
              <Skeleton variant='text' width='50%' height={32} sx={{ mt: 1 }} />
            </Box>
            <Skeleton variant='circular' width={42} height={42} />
          </Stack>
        </Card>
      </Grid>
    ))}

    {/* Columns */}
    <Grid size={{ xs: 12 }}>
      <Grid container spacing={6}>
        {/* Left Column Skeletons */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={6}>
            <Card sx={{ p: 4 }}>
              <Skeleton variant='text' width='30%' height={32} sx={{ mb: 4 }} />
              <Stack spacing={2}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} variant='rectangular' height={52} sx={{ borderRadius: 1 }} />
                ))}
              </Stack>
            </Card>
            <Card sx={{ p: 4 }}>
              <Skeleton variant='text' width='30%' height={32} sx={{ mb: 4 }} />
              <Stack spacing={2}>
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} variant='rectangular' height={52} sx={{ borderRadius: 1 }} />
                ))}
              </Stack>
            </Card>
          </Stack>
        </Grid>

        {/* Right Column Skeletons */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={6}>
            <Card sx={{ p: 5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Skeleton variant='circular' width={64} height={64} sx={{ mb: 2 }} />
              <Skeleton variant='text' width='50%' height={24} />
              <Skeleton variant='text' width='30%' height={16} sx={{ mt: 1, mb: 2 }} />
              <Skeleton variant='rectangular' width='40%' height={24} sx={{ borderRadius: 2, mb: 4 }} />
              <Divider sx={{ width: '100%', my: 2 }} />
              <Stack spacing={3} sx={{ width: '100%', mt: 2 }}>
                {[1, 2].map(i => (
                  <Stack key={i} direction='row' spacing={2} alignItems='center'>
                    <Skeleton variant='circular' width={32} height={32} />
                    <Box sx={{ width: '70%' }}>
                      <Skeleton variant='text' width='40%' height={12} />
                      <Skeleton variant='text' width='80%' height={16} />
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Card>
            <Card sx={{ p: 5 }}>
              <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 4 }}>
                <Skeleton variant='circular' width={36} height={36} />
                <Skeleton variant='text' width='40%' height={24} />
              </Stack>
              <Stack spacing={3}>
                {[1, 2, 3, 4].map(i => (
                  <Box key={i}>
                    <Skeleton variant='text' width='30%' height={12} />
                    <Skeleton variant='text' width='70%' height={16} />
                  </Box>
                ))}
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Grid>
  </Grid>
)

const MembershipDetailPage = ({ membershipId }: { membershipId: number }) => {

  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const [membership, setMembership] = useState<MembershipDetail | null>(null)
  const [error, setError] = useState<string | null>(null)


  const receipts = useMemo(() => {
    if (!membership?.payments) return []

    const map = new Map<number, any>()

    membership.payments.forEach(payment => {
      const rId = payment.receipt_id || payment.receipt?.id

      if (!rId) return

      if (!map.has(rId)) {
        map.set(rId, {
          id: rId,
          receipt_no: payment.receipt?.receipt_no || `REC-${rId}`,
          payment_date: payment.receipt?.payment_date || payment.payment_date,
          gateway: payment.receipt?.gateway || payment.gateway || 'Manual',
          transaction_id: payment.receipt?.transaction_id || payment.transaction_id || '',
          amount: 0,
          status: payment.receipt?.status || payment.status,
          installments: []
        })
      }

      const item = map.get(rId)

      item.amount += Number(payment.amount || 0)

      if (payment.installment) {
        item.installments.push(payment.installment.installment_no)
      }
    })

    return Array.from(map.values())
      .map(item => {
        const sortedInsts = item.installments.sort((a: number, b: number) => a - b)
        let installmentText = '-'

        if (sortedInsts.length > 0) {
          installmentText = sortedInsts.map((n: number) => `#${n}`).join(', ')
        }

        return {
          ...item,
          installmentText
        }
      })
      .sort((a, b) => b.id - a.id)
  }, [membership?.payments])

  const request = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    if (!accessToken) throw new Error('Missing access token')

    const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {})
      }
    })

    const payload = (await response.json().catch(() => null)) as { message?: string } | null

    if (!response.ok) throw new Error(payload?.message || 'Request failed')

    return payload as T
  }, [accessToken])

  const loadMembership = useCallback(async () => {
    try {
      const response = await request<MembershipResponse>(`/memberships/${membershipId}`)

      setMembership(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load membership.')
    }
  }, [membershipId, request])

  useEffect(() => {
    if (!accessToken) return

    void loadMembership()
  }, [accessToken, loadMembership])



  if (error) {
    return (
      <Box sx={{ p: 6 }}>
        <Alert severity='error' variant='filled' sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
        <Button variant='contained' onClick={() => void loadMembership()} sx={{ mt: 4 }}>
          Retry Loading Detail
        </Button>
      </Box>
    )
  }

  if (!membership) return <MembershipDetailSkeleton />

  // Installments calculation
  const totalInstallments = membership.installments?.length || membership.scheme?.total_installments || 0
  const paidInstallments = membership.installments?.filter(item => item.paid).length || 0
  const progressPercent = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0

  // Total paid calculation
  const totalPaid = Number(membership.total_paid || 0)

  // Next installment calculation
  const nextUnpaid = membership.installments
    ?.filter(item => !item.paid)
    .sort((a, b) => a.installment_no - b.installment_no)[0]

  const baseVal = Number(nextUnpaid?.amount || membership.scheme?.installment_value || 0)
  const penaltyVal = Number(nextUnpaid?.penalty || 0)
  const nextDueAmount = baseVal + penaltyVal



  const stats = [
    {
      title: 'Installment Progress',
      value: `${paidInstallments} / ${totalInstallments}`,
      subtext: `Paid (${progressPercent.toFixed(0)}%)`,
      iconClass: 'ri-calendar-todo-line',
      iconColor: '#3b82f6',
      progress: progressPercent
    },
    {
      title: 'Total Contribution',
      value: money.format(totalPaid),
      subtext: 'Accumulated savings',
      iconClass: 'ri-money-rupee-circle-line',
      iconColor: '#10b981'
    },
    {
      title: 'Next Installment',
      value: nextUnpaid ? money.format(nextDueAmount) : 'Fully Paid',
      subtext: nextUnpaid
        ? `Due: ${new Date(nextUnpaid.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
        : 'Scheme matured',
      iconClass: 'ri-time-line',
      iconColor: nextUnpaid ? '#f59e0b' : '#10b981'
    },
    {
      title: 'Maturity Target',
      value: new Date(membership.maturity_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      subtext: `Started: ${new Date(membership.start_date).toLocaleDateString('en-IN')}`,
      iconClass: 'ri-shield-check-line',
      iconColor: '#ef4444'
    }
  ]

  return (
    <Grid container spacing={6}>
      {/* Premium Header Banner */}
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            overflow: 'hidden',
            background: getHeaderBackground(membership.status),
            color: 'common.white',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 6 } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems={{ xs: 'flex-start', md: 'center' }} spacing={4}>
              <Stack spacing={2}>
                <Chip
                  label={membership.membership_no || `Subscription #${membership.id}`}
                  sx={{ alignSelf: 'flex-start', bgcolor: 'rgba(255,255,255,0.16)', color: 'common.white', fontWeight: 700 }}
                />
                <Typography variant='h3' sx={{ color: 'common.white', fontWeight: 800 }}>
                  {membership.customer?.name || 'Customer Account'}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.05rem' }}>
                  {`${membership.scheme?.name || 'No scheme'} • Code: ${membership.scheme?.code || 'No code'}`}
                </Typography>
              </Stack>
              <Stack direction='row' spacing={2} alignItems='center'>
                <Chip
                  label={membership.status.toUpperCase()}
                  color={getStatusColor(membership.status)}
                  variant='tonal'
                  sx={{ py: 1.5, px: 2, fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}
                />
                <Button component={Link} href='/subscriptions' variant='contained' sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'common.white', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }} size='medium'>
                  Back to List
                </Button>
              </Stack>
            </Stack>


          </CardContent>
        </Card>
      </Grid>

      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error'>{error}</Alert>
        </Grid>
      )}

      {/* KPI Stats Grid */}
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={4}>
          {stats.map((stat, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)' }}>
                <CardContent sx={{ pb: '16px !important' }}>
                  <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
                    <div>
                      <Typography variant='body2' color='text.secondary' fontWeight={600}>
                        {stat.title}
                      </Typography>
                      <Typography variant='h5' sx={{ mt: 1, fontWeight: 700 }}>
                        {stat.value}
                      </Typography>
                    </div>
                    <Avatar sx={{ bgcolor: 'action.hover', color: stat.iconColor, width: 42, height: 42 }}>
                      <i className={stat.iconClass} style={{ fontSize: '1.25rem' }} />
                    </Avatar>
                  </Stack>
                  {stat.progress !== undefined ? (
                    <Box sx={{ mt: 3 }}>
                      <LinearProgress variant='determinate' value={stat.progress} sx={{ height: 6, borderRadius: 3 }} />
                      <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block', textAlign: 'right' }}>
                        {stat.subtext}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant='caption' color='text.secondary' sx={{ mt: 2, display: 'block' }}>
                      {stat.subtext}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Split details layout */}
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={6}>
          {/* Left Column - Schedules & Transactions */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={6}>
              {/* Installments Table Card */}
              <Card sx={{ boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
                <CardContent sx={{ p: 0 }}>
                  <Typography variant='h6' sx={{ p: 4, pb: 2, fontWeight: 700 }}>
                    Installment Schedule
                  </Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
                    <Table sx={{ minWidth: 700 }} aria-label='installment schedule table'>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>No.</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Paid Date</TableCell>
                          <TableCell align='right' sx={{ fontWeight: 600 }}>Base Amount</TableCell>
                          <TableCell align='right' sx={{ fontWeight: 600 }}>Penalty</TableCell>
                          <TableCell align='right' sx={{ fontWeight: 600 }}>Total Payable</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...(membership.installments || [])]
                          .sort((a, b) => a.installment_no - b.installment_no)
                          .map(item => {
                          const isOverdue = !item.paid && new Date(item.due_date) < new Date()
                          const baseAmount = Number(item.amount || membership.scheme?.installment_value || 0)
                          const penalty = Number(item.penalty || 0)
                          const totalPayable = baseAmount + penalty

                          return (
                            <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                              <TableCell component='th' scope='row' sx={{ fontWeight: 600 }}>
                                #{item.installment_no}
                              </TableCell>
                              <TableCell>{new Date(item.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                              <TableCell>
                                {item.paid_date
                                  ? new Date(item.paid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : '-'}
                              </TableCell>
                              <TableCell align='right'>{`Rs ${baseAmount.toLocaleString('en-IN')}`}</TableCell>
                              <TableCell align='right'>
                                <Typography color={penalty > 0 ? 'error' : 'text.secondary'}>
                                  {`Rs ${penalty.toLocaleString('en-IN')}`}
                                </Typography>
                              </TableCell>
                              <TableCell align='right' sx={{ fontWeight: 600 }}>
                                {`Rs ${totalPayable.toLocaleString('en-IN')}`}
                              </TableCell>
                              <TableCell>
                                {item.paid ? (
                                  <Chip size='small' label='Paid' color='success' variant='tonal' />
                                ) : isOverdue ? (
                                  <Chip size='small' label='Overdue' color='error' variant='tonal' />
                                ) : (
                                  <Chip size='small' label='Pending' color='warning' variant='tonal' />
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Payments History Card */}
              <Card sx={{ boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
                <CardContent sx={{ p: 0 }}>
                  <Typography variant='h6' sx={{ p: 4, pb: 2, fontWeight: 700 }}>
                    Payment History
                  </Typography>
                  {!receipts.length ? (
                    <Box sx={{ p: 4 }}>
                      <Alert severity='info'>No payments recorded yet.</Alert>
                    </Box>
                  ) : (
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
                      <Table sx={{ minWidth: 700 }} aria-label='membership payments table'>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Receipt No.</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Installments</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Gateway / Reference</TableCell>
                            <TableCell align='right' sx={{ fontWeight: 600 }}>Amount</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                            <TableCell align='right' sx={{ fontWeight: 600 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {receipts.map(item => (
                            <TableRow key={item.id} hover>
                              <TableCell>{new Date(item.payment_date).toLocaleDateString('en-IN')}</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{item.receipt_no}</TableCell>
                              <TableCell>{item.installmentText}</TableCell>
                              <TableCell>
                                <Typography variant='body2' fontWeight={500}>{item.gateway || 'Manual'}</Typography>
                                <Typography variant='caption' color='text.secondary'>{item.transaction_id || 'No reference id'}</Typography>
                              </TableCell>
                              <TableCell align='right'>{`Rs ${Number(item.amount || 0).toLocaleString('en-IN')}`}</TableCell>
                              <TableCell>
                                <Chip
                                  size='small'
                                  label={item.status}
                                  color={getStatusColor(item.status)}
                                  variant='tonal'
                                  sx={{ textTransform: 'capitalize' }}
                                />
                              </TableCell>
                              <TableCell align='right'>
                                <Button component={Link} href={`/payments/receipt/${item.id}`} size='small' variant='outlined'>
                                  Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* Right Column - Profiles & Metadata */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={6}>
              {/* Customer Profile Card */}
              <Card sx={{ boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
                <CardContent sx={{ textAlign: 'center', pt: 5 }}>
                  <Stack spacing={2} alignItems='center'>
                    <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: '2rem', fontWeight: 700 }}>
                      {membership.customer?.name?.[0]?.toUpperCase() || 'C'}
                    </Avatar>
                    <div>
                      <Typography variant='h6' sx={{ fontWeight: 700 }}>
                        {membership.customer?.name || 'Unknown customer'}
                      </Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                        Loyalty Level: {membership.customer?.category || 'Regular'}
                      </Typography>
                    </div>
                    <Chip
                      size='small'
                      label={membership.customer?.kyc?.status ? `KYC: ${membership.customer.kyc.status}` : 'KYC: Pending'}
                      color={membership.customer?.kyc?.status === 'approved' ? 'success' : 'warning'}
                      variant='tonal'
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Stack>
                  <Divider sx={{ my: 4 }} />
                  <Stack spacing={3} sx={{ textAlign: 'left' }}>
                    <Stack direction='row' alignItems='center' spacing={2}>
                      <Avatar sx={{ bgcolor: 'action.hover', color: 'text.secondary', width: 32, height: 32 }}>
                        <i className='ri-phone-line' style={{ fontSize: '1rem' }} />
                      </Avatar>
                      <div>
                        <Typography variant='caption' color='text.secondary' display='block'>Mobile</Typography>
                        <Typography variant='body2' fontWeight={600}>{membership.customer?.mobile || 'No mobile'}</Typography>
                      </div>
                    </Stack>
                    <Stack direction='row' alignItems='center' spacing={2}>
                      <Avatar sx={{ bgcolor: 'action.hover', color: 'text.secondary', width: 32, height: 32 }}>
                        <i className='ri-mail-line' style={{ fontSize: '1rem' }} />
                      </Avatar>
                      <div>
                        <Typography variant='caption' color='text.secondary' display='block'>Email Address</Typography>
                        <Typography variant='body2' fontWeight={600}>{membership.customer?.email || 'No email registered'}</Typography>
                      </div>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              {/* Scheme Rules Card */}
              <Card sx={{ boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
                <CardContent>
                  <Stack direction='row' alignItems='center' spacing={2} sx={{ mb: 4 }}>
                    <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main', width: 36, height: 36 }}>
                      <i className='ri-settings-4-line' style={{ fontSize: '1.1rem' }} />
                    </Avatar>
                    <Typography variant='h6' sx={{ fontWeight: 700 }}>Scheme Settings</Typography>
                  </Stack>
                  <Stack spacing={3}>
                    <div>
                      <Typography variant='caption' color='text.secondary' display='block'>Name & Code</Typography>
                      <Typography variant='body2' fontWeight={600}>
                        {membership.scheme?.name || 'No scheme'} ({membership.scheme?.code || 'No code'})
                      </Typography>
                    </div>
                    <div>
                      <Typography variant='caption' color='text.secondary' display='block'>Installment Value</Typography>
                      <Typography variant='body2' fontWeight={600}>
                        {membership.scheme?.installment_value ? money.format(Number(membership.scheme.installment_value)) : 'N/A'}
                      </Typography>
                    </div>
                    <Stack direction='row' spacing={2} justifyContent='space-between'>
                      <div>
                        <Typography variant='caption' color='text.secondary' display='block'>Total Months</Typography>
                        <Typography variant='body2' fontWeight={600}>
                          {membership.scheme?.total_installments ? `${membership.scheme.total_installments} Months` : 'N/A'}
                        </Typography>
                      </div>
                      <div>
                        <Typography variant='caption' color='text.secondary' display='block'>Free Months</Typography>
                        <Typography variant='body2' fontWeight={600}>
                          {membership.scheme?.free_installments ?? 0}
                        </Typography>
                      </div>
                    </Stack>
                    <Stack direction='row' spacing={2} justifyContent='space-between'>
                      <div>
                        <Typography variant='caption' color='text.secondary' display='block'>Scheme Type</Typography>
                        <Typography variant='body2' fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                          {membership.scheme?.scheme_type || 'N/A'}
                        </Typography>
                      </div>
                      <div>
                        <Typography variant='caption' color='text.secondary' display='block'>Benefit Mode</Typography>
                        <Typography variant='body2' fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                          {membership.scheme?.benefit_mode || 'N/A'}
                        </Typography>
                      </div>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              {/* Physical Card Metadata Card */}
              <Card sx={{ boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
                <CardContent>
                  <Stack direction='row' alignItems='center' spacing={2} sx={{ mb: 4 }}>
                    <Avatar sx={{ bgcolor: 'info.light', color: 'info.main', width: 36, height: 36 }}>
                      <i className='ri-bank-card-line' style={{ fontSize: '1.1rem' }} />
                    </Avatar>
                    <Typography variant='h6' sx={{ fontWeight: 700 }}>Card Metadata</Typography>
                  </Stack>
                  <Stack spacing={3}>
                    <div>
                      <Typography variant='caption' color='text.secondary' display='block'>Membership No.</Typography>
                      <Typography variant='body2' fontWeight={600}>
                        {membership.membership_no || 'Not Assigned'}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant='caption' color='text.secondary' display='block'>Physical Card No.</Typography>
                      <Typography variant='body2' fontWeight={600}>
                        {membership.card_no || 'Not Assigned'}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant='caption' color='text.secondary' display='block'>Card Reference</Typography>
                      <Typography variant='body2' fontWeight={600}>
                        {membership.card_reference || 'N/A'}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant='caption' color='text.secondary' display='block'>Card Issued At</Typography>
                      <Typography variant='body2' fontWeight={600}>
                        {membership.card_issued_at ? new Date(membership.card_issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                      </Typography>
                    </div>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Grid>


    </Grid>
  )
}

export default MembershipDetailPage
