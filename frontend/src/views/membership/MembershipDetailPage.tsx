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
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'

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
  user?: { id: number; name?: string | null } | null
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
    weight?: string | number | null
    rate_per_gram?: string | number | null
    manual_weight?: string | number | null
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



const resolveBackendApiUrl = getApiBaseUrl

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
import { getApiBaseUrl } from '@/libs/runtimeConfig'

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
  const [editingInstallment, setEditingInstallment] = useState<NonNullable<MembershipDetail['installments']>[number] | null>(null)
  const [editWeight, setEditWeight] = useState('')
  const [editPenalty, setEditPenalty] = useState('')
  const [editPaidDate, setEditPaidDate] = useState('')
  const [editPayableAmount, setEditPayableAmount] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [undoDialogOpen, setUndoDialogOpen] = useState(false)
  const [undoSaving, setUndoSaving] = useState(false)
  const [undoError, setUndoError] = useState<string | null>(null)

  const [openingEditOpen, setOpeningEditOpen] = useState(false)
  const [openingEditForm, setOpeningEditForm] = useState({
    start_date: '',
    membership_no: '',
    card_no: '',
    card_reference: '',
    card_issued_at: '',
    user_id: null as number | null
  })
  const [openingEditSaving, setOpeningEditSaving] = useState(false)
  const [openingEditError, setOpeningEditError] = useState<string | null>(null)
  const [salesmen, setSalesmen] = useState<Array<{ id: number; name: string }>>([])

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

  const openEditInstallment = (item: NonNullable<MembershipDetail['installments']>[number]) => {
    setEditingInstallment(item)
    setEditWeight(String(item.manual_weight ?? item.weight ?? ''))
    setEditPenalty(String(item.penalty ?? '0'))
    setEditPaidDate(item.paid_date ? item.paid_date.slice(0, 10) : '')
    setEditPayableAmount(String(item.amount ?? ''))
    setEditError(null)
  }

  const closeEditInstallment = () => {
    if (editSaving) return
    setEditingInstallment(null)
    setEditError(null)
  }

  const handleSaveInstallmentEdit = async () => {
    if (!editingInstallment || !membership) return

    const weightValue = Number(editWeight)
    const penaltyValue = Number(editPenalty || 0)

    const payableAmountValue = Number(editPayableAmount || 0)

    if (!Number.isFinite(payableAmountValue) || payableAmountValue < 0) {
      setEditError('Enter a valid payable amount.')
      return
    }

    if (!Number.isFinite(weightValue) || weightValue < 0) {
      setEditError('Enter a valid weight.')
      return
    }

    if (!Number.isFinite(penaltyValue) || penaltyValue < 0) {
      setEditError('Enter a valid penalty.')
      return
    }

    setEditSaving(true)
    setEditError(null)

    try {
      await request(`/installments/${editingInstallment.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          membership_id: membership.id,
          installment_no: editingInstallment.installment_no,
          due_date: editingInstallment.due_date,
          amount: payableAmountValue,
          paid: editingInstallment.paid,
          paid_date: editPaidDate || null,
          penalty: penaltyValue,
          manual_weight: weightValue
        })
      })

      setEditingInstallment(null)
      await loadMembership()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update installment.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleUndoForceClose = async () => {
    setUndoSaving(true)
    setUndoError(null)

    try {
      await request(`/memberships/${membershipId}/undo-force-close`, { method: 'POST' })
      setUndoDialogOpen(false)
      await loadMembership()
    } catch (err) {
      setUndoError(err instanceof Error ? err.message : 'Failed to undo force close.')
    } finally {
      setUndoSaving(false)
    }
  }

  const openOpeningEditDialog = async () => {
    if (!membership) return

    setOpeningEditForm({
      start_date: membership.start_date ? membership.start_date.slice(0, 10) : '',
      membership_no: membership.membership_no || '',
      card_no: membership.card_no || '',
      card_reference: membership.card_reference || '',
      card_issued_at: membership.card_issued_at ? membership.card_issued_at.slice(0, 10) : '',
      user_id: membership.user_id ?? null
    })
    setOpeningEditError(null)
    setOpeningEditOpen(true)

    if (salesmen.length === 0) {
      try {
        const response = await request<{ data: Array<{ id: number; name: string }> }>(
          '/salesmen?per_page=100&sort_by=name&sort_direction=asc&status=active'
        )

        setSalesmen(response.data)
      } catch {
        // Salesman list is a nice-to-have — the field just shows unassigned if this fails.
      }
    }
  }

  const closeOpeningEditDialog = () => {
    if (openingEditSaving) return
    setOpeningEditOpen(false)
    setOpeningEditError(null)
  }

  const handleSaveOpeningEdit = async () => {
    if (!membership) return

    setOpeningEditSaving(true)
    setOpeningEditError(null)

    try {
      await request(`/memberships/${membershipId}`, {
        method: 'PUT',
        body: JSON.stringify({
          customer_id: membership.customer_id,
          scheme_id: membership.scheme_id,
          status: membership.status,
          start_date: openingEditForm.start_date,
          membership_no: openingEditForm.membership_no || null,
          card_no: openingEditForm.card_no || null,
          card_reference: openingEditForm.card_reference || null,
          card_issued_at: openingEditForm.card_issued_at || null,
          user_id: openingEditForm.user_id
        })
      })

      setOpeningEditOpen(false)
      await loadMembership()
    } catch (err) {
      setOpeningEditError(err instanceof Error ? err.message : 'Failed to update opening entry details.')
    } finally {
      setOpeningEditSaving(false)
    }
  }


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

  const isWeightScheme = (membership.scheme?.scheme_type || '').toLowerCase() === 'weight'

  // Installments calculation
  const totalInstallments = membership.installments?.length || membership.scheme?.total_installments || 0
  const paidInstallments = membership.installments?.filter(item => item.paid).length || 0

  // Ensure the currently-assigned salesman always appears as a selectable option,
  // even if they're not in the active-staff list the dropdown fetches (e.g. the
  // membership's user_id was auto-resolved to the customer's own linked account).
  const salesmanOptions = membership.user && !salesmen.some(item => item.id === membership.user!.id)
    ? [{ id: membership.user.id, name: membership.user.name || `User #${membership.user.id}` }, ...salesmen]
    : salesmen
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
                  label={membership.membership_no || `Membership #${membership.id}`}
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
                {membership.status === 'closed' ? (
                  <Button onClick={() => setUndoDialogOpen(true)} variant='contained' color='warning' size='medium' startIcon={<i className='ri-arrow-go-back-line' />}>
                    Undo Force Close
                  </Button>
                ) : (
                  <Button component={Link} href={`/membership/${membership.id}/closing-preview`} variant='contained' sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'common.white', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }} size='medium'>
                    Close Scheme
                  </Button>
                )}
                <Button component={Link} href='/membership' variant='contained' sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'common.white', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }} size='medium'>
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
                          {isWeightScheme && (
                            <TableCell align='right' sx={{ fontWeight: 600 }}>Weight (g)</TableCell>
                          )}
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                          <TableCell align='right' sx={{ fontWeight: 600 }}>Actions</TableCell>
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
                              {isWeightScheme && (
                                <TableCell align='right'>
                                  {item.weight != null ? `${Number(item.weight).toFixed(4)} g` : '-'}
                                </TableCell>
                              )}
                              <TableCell>
                                {item.paid ? (
                                  <Chip size='small' label='Paid' color='success' variant='tonal' />
                                ) : isOverdue ? (
                                  <Chip size='small' label='Overdue' color='error' variant='tonal' />
                                ) : (
                                  <Chip size='small' label='Pending' color='warning' variant='tonal' />
                                )}
                              </TableCell>
                              <TableCell align='right'>
                                {item.paid && (
                                  <IconButton size='small' color='primary' onClick={() => openEditInstallment(item)}>
                                    <i className='ri-edit-line' style={{ fontSize: '1.1rem' }} />
                                  </IconButton>
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

              {/* Opening Entry Details Card */}
              <Card sx={{ boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
                <CardContent>
                  <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 4 }}>
                    <Stack direction='row' alignItems='center' spacing={2}>
                      <Avatar sx={{ bgcolor: 'info.light', color: 'info.main', width: 36, height: 36 }}>
                        <i className='ri-bank-card-line' style={{ fontSize: '1.1rem' }} />
                      </Avatar>
                      <Typography variant='h6' sx={{ fontWeight: 700 }}>Opening Entry Details</Typography>
                    </Stack>
                    <IconButton size='small' onClick={() => void openOpeningEditDialog()} title='Edit opening entry details'>
                      <i className='ri-edit-box-line' style={{ fontSize: '1.1rem' }} />
                    </IconButton>
                  </Stack>
                  <Stack spacing={3}>
                    <div>
                      <Typography variant='caption' color='text.secondary' display='block'>Opening Date</Typography>
                      <Typography variant='body2' fontWeight={600}>
                        {new Date(membership.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant='caption' color='text.secondary' display='block'>Salesman</Typography>
                      <Typography variant='body2' fontWeight={600}>
                        {membership.user?.name || 'Unassigned'}
                      </Typography>
                    </div>
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

      <Dialog open={Boolean(editingInstallment)} onClose={closeEditInstallment} maxWidth='xs' fullWidth>
        <DialogTitle>Edit Installment #{editingInstallment?.installment_no}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {editError && <Alert severity='error'>{editError}</Alert>}
            <TextField
              label='Paid Date'
              type='date'
              value={editPaidDate}
              onChange={e => setEditPaidDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              autoFocus
            />
            <TextField
              label='Payable Amount'
              type='number'
              value={editPayableAmount}
              onChange={e => setEditPayableAmount(e.target.value)}
              fullWidth
            />
            <TextField
              label='Penalty'
              type='number'
              value={editPenalty}
              onChange={e => setEditPenalty(e.target.value)}
              fullWidth
            />
            {isWeightScheme && (
              <TextField
                label='Weight (g)'
                type='number'
                value={editWeight}
                onChange={e => setEditWeight(e.target.value)}
                fullWidth
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditInstallment} disabled={editSaving}>Cancel</Button>
          <Button variant='contained' onClick={() => void handleSaveInstallmentEdit()} disabled={editSaving}>
            {editSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={undoDialogOpen} onClose={() => !undoSaving && setUndoDialogOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Undo Force Close?</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {undoError && <Alert severity='error'>{undoError}</Alert>}
            <Alert severity='warning'>
              This reverses the force-closure — a reversal entry is posted against the original closing voucher
              (nothing is deleted) and the scheme reopens to its status before it was force-closed.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUndoDialogOpen(false)} disabled={undoSaving}>Cancel</Button>
          <Button variant='contained' color='warning' onClick={() => void handleUndoForceClose()} disabled={undoSaving}>
            {undoSaving ? 'Undoing...' : 'Undo Force Close'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openingEditOpen} onClose={closeOpeningEditDialog} maxWidth='sm' fullWidth>
        <DialogTitle>Edit Opening Entry Details</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {openingEditError && <Alert severity='error'>{openingEditError}</Alert>}
            <Alert severity='info'>
              Customer and Scheme can&apos;t be changed here — reassigning either would orphan the installment and
              payment history already generated against this membership.
            </Alert>

            <TextField
              fullWidth
              type='date'
              label='Opening Date'
              value={openingEditForm.start_date}
              onChange={e => setOpeningEditForm(prev => ({ ...prev, start_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />

            <Autocomplete
              fullWidth
              options={salesmanOptions}
              getOptionLabel={option => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={salesmanOptions.find(item => item.id === openingEditForm.user_id) || null}
              onChange={(_, value) => setOpeningEditForm(prev => ({ ...prev, user_id: value ? value.id : null }))}
              renderInput={params => <TextField {...params} label='Salesman' placeholder='Search salesman...' />}
            />

            <Stack direction='row' spacing={2}>
              <TextField
                fullWidth
                label='Membership No.'
                value={openingEditForm.membership_no}
                onChange={e => setOpeningEditForm(prev => ({ ...prev, membership_no: e.target.value }))}
              />
              <TextField
                fullWidth
                label='Physical Card No.'
                value={openingEditForm.card_no}
                onChange={e => setOpeningEditForm(prev => ({ ...prev, card_no: e.target.value }))}
              />
            </Stack>

            <Stack direction='row' spacing={2}>
              <TextField
                fullWidth
                label='Card Reference'
                value={openingEditForm.card_reference}
                onChange={e => setOpeningEditForm(prev => ({ ...prev, card_reference: e.target.value }))}
              />
              <TextField
                fullWidth
                type='date'
                label='Card Issued At'
                value={openingEditForm.card_issued_at}
                onChange={e => setOpeningEditForm(prev => ({ ...prev, card_issued_at: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeOpeningEditDialog} disabled={openingEditSaving}>Cancel</Button>
          <Button variant='contained' onClick={() => void handleSaveOpeningEdit()} disabled={openingEditSaving}>
            {openingEditSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default MembershipDetailPage
