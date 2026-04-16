'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'

type MembershipOption = {
  id: number
  customer?: { name?: string | null; mobile: string } | null
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
  installment?: { installment_no: number } | null
}

type PaymentsResponse = { data: PaymentItem[] }
type MembershipsResponse = { data: MembershipOption[] }

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const PaymentListPage = ({ title, query }: { title: string; query: string }) => {
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
    const [paymentsResponse, membershipsResponse] = await Promise.all([
      request<PaymentsResponse>(`/payments?per_page=200&${query}`),
      request<MembershipsResponse>('/memberships?per_page=300&status=active')
    ])
    setPayments(paymentsResponse.data)
    setMemberships(membershipsResponse.data)
  }, [query, request])

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
      await request('/payments', {
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
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <div>
                <Typography variant='h4'>{title}</Typography>
                <Typography color='text.secondary'>Record collections and track membership-linked payment history.</Typography>
              </div>
              {error ? <Alert severity='error'>{error}</Alert> : null}
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, lg: 4 }}>
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
                        <TextField fullWidth type='date' label='Payment Date' value={paymentDate} onChange={event => setPaymentDate(event.target.value)} InputLabelProps={{ shrink: true }} />
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
                <Grid size={{ xs: 12, lg: 8 }}>
                  <Card variant="outlined">
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
                      <Table sx={{ minWidth: 650 }} aria-label="payments ledger table">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Customer & Scheme</TableCell>
                            <TableCell>Installment</TableCell>
                            <TableCell>Gateway & Txn</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {payments.map(item => (
                            <TableRow key={item.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                              <TableCell>{new Date(item.payment_date).toLocaleDateString('en-IN')}</TableCell>
                              <TableCell>
                                <Typography fontWeight={600} variant="body2">{item.membership?.customer?.name || item.membership?.customer?.mobile || 'Unknown'}</Typography>
                                <Typography variant="caption" color="text.secondary">{item.membership?.scheme?.name || 'No scheme'}</Typography>
                              </TableCell>
                              <TableCell>#{item.installment?.installment_no || '-'}</TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{item.gateway || 'manual'}</Typography>
                                <Typography variant="caption" color="text.secondary">{item.transaction_id || 'N/A'}</Typography>
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</TableCell>
                              <TableCell>
                                <Chip 
                                  size="small" 
                                  label={item.status} 
                                  color={item.status === 'success' ? 'success' : item.status === 'pending' ? 'warning' : 'error'} 
                                  variant="tonal" 
                                  sx={{ textTransform: 'capitalize' }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                          {!payments.length && (
                            <TableRow>
                              <TableCell colSpan={6} align="center">
                                <Alert severity="info" sx={{ m: 2 }}>No payments found.</Alert>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default PaymentListPage
