'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
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

import { SkeletonTable } from '@/components/SkeletonLoader'

type MembershipOption = {
  id: number
  customer?: { id?: number; name?: string | null; mobile: string } | null
  scheme?: { name: string; code: string } | null
}

type PaymentItem = {
  id: number
  amount: string | number
  status: string
  payment_date: string
  gateway?: string | null
  transaction_id?: string | null
  membership?: MembershipOption | null
  installment?: {
    id?: number
    installment_no: number
    amount?: string | number | null
    penalty?: string | number | null
  } | null
}

type PaymentsResponse = { data: PaymentItem[] }
type MembershipsResponse = { data: MembershipOption[] }

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const buildQueryString = (baseQuery: string, customerId?: string | null) => {
  const params = new URLSearchParams(baseQuery)

  if (customerId) {
    params.set('customer_id', customerId)
  }

  return params.toString()
}

const getStatusColor = (status: string) => {
  if (status === 'success') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'refunded') return 'info'

  return 'error'
}

const PaymentListPage = ({
  title,
  query,
  showCreateForm = true,
  showLedger = true
}: {
  title: string
  query: string
  showCreateForm?: boolean
  showLedger?: boolean
}) => {
  const searchParams = useSearchParams()
  const customerId = searchParams.get('customer_id')

  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [memberships, setMemberships] = useState<MembershipOption[]>([])
  const [membershipId, setMembershipId] = useState('')
  const [amount, setAmount] = useState('')
  const [gateway, setGateway] = useState('cash')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<'success' | 'pending' | 'failed' | 'refunded'>('success')
  const [transactionId, setTransactionId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  const ledgerQuery = useMemo(() => buildQueryString(query, customerId), [customerId, query])

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

    const payload = (await response.json().catch(() => null)) as { message?: string; errors?: Record<string, string[]> } | null

    if (!response.ok) {
      const validationMessage = payload?.errors ? Object.values(payload.errors).flat().join(' ') : null

      throw new Error(validationMessage || payload?.message || 'Request failed')
    }

    return payload as T
  }, [accessToken])

  const load = useCallback(async () => {
    setLoading(true)
    const jobs: Array<Promise<unknown>> = []

    if (showLedger) {
      jobs.push(request<PaymentsResponse>(`/payments?per_page=200&${ledgerQuery}`))
    }

    if (showCreateForm) {
      jobs.push(request<MembershipsResponse>('/memberships?per_page=300&status=active'))
    }

    const results = await Promise.all(jobs)
    let cursor = 0

    if (showLedger) {
      const paymentsResponse = results[cursor] as PaymentsResponse
      setPayments(paymentsResponse.data)
      cursor += 1
    } else {
      setPayments([])
    }

    if (showCreateForm) {
      const membershipsResponse = results[cursor] as MembershipsResponse
      setMemberships(customerId ? membershipsResponse.data.filter(item => String(item.customer?.id || '') === customerId) : membershipsResponse.data)
    } else {
      setMemberships([])
    }
    setLoading(false)
  }, [customerId, ledgerQuery, request, showCreateForm, showLedger])

  useEffect(() => {
    if (!accessToken) return

    void load().catch(err => setError(err instanceof Error ? err.message : 'Failed to load payments.'))
  }, [accessToken, load])

  const handleCreate = async () => {
    if (!membershipId || !amount || Number(amount) <= 0) {
      setError('Membership and amount are required.')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await request<{ data: PaymentItem }>('/payments', {
        method: 'POST',
        body: JSON.stringify({
          membership_id: Number(membershipId),
          amount: Number(amount),
          gateway,
          transaction_id: transactionId || null,
          payment_date: paymentDate,
          status
        })
      })

      setAmount('')
      setTransactionId('')
      setMembershipId('')
      await load()

      if (response.data.id && response.data.status === 'success') {
        window.location.href = `/payments/receipt/${response.data.id}?autoprint=1`
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment.')
    } finally {
      setSaving(false)
    }
  }

  const summary = useMemo(() => {
    const total = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const successful = payments.filter(item => item.status === 'success')
    const pending = payments.filter(item => item.status === 'pending').length

    return {
      total,
      successful: successful.length,
      pending,
      lastPaymentDate: payments[0]?.payment_date
    }
  }, [payments])

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
                <div>
                  <Typography variant='h4'>{title}</Typography>
                  <Typography color='text.secondary'>
                    {customerId
                      ? 'Customer-scoped payment history with installment and membership mapping.'
                      : showCreateForm && !showLedger
                        ? 'Create a payment entry for an active membership.'
                        : 'Record collections and track membership-linked payment history.'}
                  </Typography>
                </div>
                {customerId ? (
                  <Button component={Link} href='/payments/history' variant='outlined' color='secondary'>
                    Back to Global History
                  </Button>
                ) : null}
              </Stack>

              {showLedger ? (
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Card variant='outlined'>
                      <CardContent>
                        <Typography color='text.secondary'>Successful Payments</Typography>
                        <Typography variant='h4' sx={{ mt: 2 }}>
                          {summary.successful}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Card variant='outlined'>
                      <CardContent>
                        <Typography color='text.secondary'>Pending Items</Typography>
                        <Typography variant='h4' sx={{ mt: 2 }}>
                          {summary.pending}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Card variant='outlined'>
                      <CardContent>
                        <Typography color='text.secondary'>Total Collected</Typography>
                        <Typography variant='h4' sx={{ mt: 2 }}>
                          {`Rs ${summary.total.toLocaleString('en-IN')}`}
                        </Typography>
                        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                          {summary.lastPaymentDate ? `Latest ${new Date(summary.lastPaymentDate).toLocaleDateString('en-IN')}` : 'No payments yet'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              ) : null}

              {error ? <Alert severity='error'>{error}</Alert> : null}

              <Grid container spacing={3}>
                {showCreateForm ? (
                  <Grid size={{ xs: 12, lg: showLedger ? 4 : 6 }}>
                    <Card variant='outlined'>
                      <CardContent>
                        <Stack spacing={2}>
                          <Typography fontWeight={700}>Record Payment</Typography>
                          <TextField select fullWidth label='Membership' value={membershipId} onChange={event => setMembershipId(event.target.value)}>
                            {memberships.map(item => (
                              <MenuItem key={item.id} value={item.id}>
                                {(item.customer?.name || item.customer?.mobile || 'Unknown customer') + ` • ${item.scheme?.code || 'No scheme'}`}
                              </MenuItem>
                            ))}
                          </TextField>
                          <TextField fullWidth label='Amount' value={amount} onChange={event => setAmount(event.target.value)} />
                          <TextField fullWidth label='Gateway / Mode' value={gateway} onChange={event => setGateway(event.target.value)} />
                          <TextField fullWidth label='Transaction ID' value={transactionId} onChange={event => setTransactionId(event.target.value)} />
                          <TextField
                            fullWidth
                            type='date'
                            label='Payment Date'
                            value={paymentDate}
                            onChange={event => setPaymentDate(event.target.value)}
                            InputLabelProps={{ shrink: true }}
                          />
                          <TextField select fullWidth label='Status' value={status} onChange={event => setStatus(event.target.value as typeof status)}>
                            <MenuItem value='success'>Success</MenuItem>
                            <MenuItem value='pending'>Pending</MenuItem>
                            <MenuItem value='failed'>Failed</MenuItem>
                            <MenuItem value='refunded'>Refunded</MenuItem>
                          </TextField>
                          <Button variant='contained' onClick={() => void handleCreate()} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Payment'}
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ) : null}

                {showLedger ? (
                  <Grid size={{ xs: 12, lg: showCreateForm ? 8 : 12 }}>
                    <Card variant='outlined'>
                      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
                        <Table sx={{ minWidth: 900 }} aria-label='payments ledger table'>
                          <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Customer</TableCell>
                              <TableCell>Scheme / Membership</TableCell>
                              <TableCell>Installment</TableCell>
                              <TableCell>Gateway / Reference</TableCell>
                              <TableCell align='right'>Amount</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell align='right'>Receipt</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {loading ? (
                              <SkeletonTable rows={8} cols={7} />
                            ) : payments.map(item => {
                              const installmentAmount = Number(item.installment?.amount || 0)
                              const installmentPenalty = Number(item.installment?.penalty || 0)

                              return (
                                <TableRow key={item.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                  <TableCell>{new Date(item.payment_date).toLocaleDateString('en-IN')}</TableCell>
                                  <TableCell>
                                    <Typography fontWeight={600} variant='body2'>
                                      {item.membership?.customer?.name || item.membership?.customer?.mobile || 'Unknown'}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                      {item.membership?.customer?.mobile || 'No mobile'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant='body2' fontWeight={600}>
                                      {item.membership?.scheme?.name || 'No scheme'}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                      {`${item.membership?.scheme?.code || 'No code'} • Membership #${item.membership?.id || '-'}`}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant='body2' fontWeight={600}>
                                      #{item.installment?.installment_no || '-'}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                      {installmentAmount || installmentPenalty
                                        ? `Base Rs ${installmentAmount.toLocaleString('en-IN')} • Penalty Rs ${installmentPenalty.toLocaleString('en-IN')}`
                                        : 'Auto or manual payment'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant='body2' sx={{ textTransform: 'capitalize' }}>
                                      {item.gateway || 'manual'}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                      {item.transaction_id || 'No reference id'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align='right' sx={{ fontWeight: 600 }}>
                                    {`Rs ${Number(item.amount || 0).toLocaleString('en-IN')}`}
                                  </TableCell>
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
                                      View Receipt
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              )
                            })}

                            {!payments.length && (
                              <TableRow>
                                <TableCell colSpan={8} align='center'>
                                  <Box sx={{ p: 3 }}>
                                    <Alert severity='info'>No payments found.</Alert>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Card>
                  </Grid>
                ) : null}
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default PaymentListPage
