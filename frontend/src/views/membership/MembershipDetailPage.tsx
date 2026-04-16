'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

type MembershipDetail = {
  id: number
  customer_id: number
  scheme_id: number
  user_id?: number | null
  start_date: string
  maturity_date: string
  total_paid: string | number
  status: string
  customer?: { id: number; name?: string | null; mobile: string; kyc?: { status?: string | null } | null } | null
  scheme?: { id: number; name: string; code: string; installment_value?: string | number | null } | null
  installments?: Array<{ 
    id: number; 
    installment_no: number; 
    due_date: string; 
    paid: boolean;
    amount?: string | number;
    penalty?: string | number;
    paid_date?: string | null;
  }>
  payments?: Array<{ id: number; amount: string | number; payment_date: string; status: string; installment?: { installment_no: number } | null }>
}

type MembershipResponse = { data: MembershipDetail }

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const MembershipDetailPage = ({ membershipId }: { membershipId: number }) => {
  const router = useRouter()
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const [membership, setMembership] = useState<MembershipDetail | null>(null)
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

  const updateStatus = async (status: string) => {
    if (!membership) return
    setSaving(true)
    setError(null)
    try {
      await request(`/memberships/${membership.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          customer_id: membership.customer_id,
          user_id: membership.user_id,
          scheme_id: membership.scheme_id,
          start_date: membership.start_date,
          maturity_date: membership.maturity_date,
          total_paid: membership.total_paid,
          status
        })
      })
      await loadMembership()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update membership.')
    } finally {
      setSaving(false)
    }
  }

  if (!membership) return <Alert severity={error ? 'error' : 'info'}>{error || 'Loading membership...'}</Alert>

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
                <div>
                  <Typography variant='h4'>{membership.customer?.name || `Membership #${membership.id}`}</Typography>
                  <Typography color='text.secondary'>{`${membership.scheme?.name || 'No scheme'} • ${membership.scheme?.code || 'No code'}`}</Typography>
                </div>
                <Stack direction='row' spacing={1}>
                  <Chip label={membership.status} color='primary' variant='tonal' />
                  <Button component={Link} href='/membership/active' variant='outlined'>Back</Button>
                </Stack>
              </Stack>
              {error ? <Alert severity='error'>{error}</Alert> : null}
              <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                <Button disabled={saving} variant='contained' onClick={() => void updateStatus('completed')}>Mark Matured</Button>
                <Button disabled={saving} variant='outlined' onClick={() => void updateStatus('redeemed')}>Mark Redeemed</Button>
                <Button disabled={saving} variant='outlined' color='error' onClick={() => void updateStatus('cancelled')}>Close Membership</Button>
              </Stack>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant='outlined'><CardContent><Stack spacing={1}>
                    <Typography fontWeight={700}>Customer</Typography>
                    <Typography>{membership.customer?.name || 'Unknown'}</Typography>
                    <Typography color='text.secondary'>{membership.customer?.mobile || 'No mobile'}</Typography>
                    <Typography color='text.secondary'>KYC: {membership.customer?.kyc?.status || 'pending'}</Typography>
                  </Stack></CardContent></Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant='outlined'><CardContent><Stack spacing={1}>
                    <Typography fontWeight={700}>Membership Summary</Typography>
                    <Typography color='text.secondary'>{`Start ${new Date(membership.start_date).toLocaleDateString('en-IN')}`}</Typography>
                    <Typography color='text.secondary'>{`Maturity ${new Date(membership.maturity_date).toLocaleDateString('en-IN')}`}</Typography>
                    <Typography color='text.secondary'>{`Total paid ₹${Number(membership.total_paid || 0).toLocaleString('en-IN')}`}</Typography>
                  </Stack></CardContent></Card>
                </Grid>
                <Grid size={{ xs: 12, lg: 12 }}>
                  <Card variant='outlined'>
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
                      <Table sx={{ minWidth: 650 }} aria-label="installment schedule table">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell>No.</TableCell>
                            <TableCell>Due Date</TableCell>
                            <TableCell align="right">Base Amount</TableCell>
                            <TableCell align="right">Penalty</TableCell>
                            <TableCell align="right">Total Payable</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Paid Date</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {membership.installments?.map(item => {
                            const isOverdue = !item.paid && new Date(item.due_date) < new Date();
                            const baseAmount = Number(item.amount || membership.scheme?.installment_value || 0);
                            const penalty = Number(item.penalty || 0);
                            const totalPayable = baseAmount + penalty;
                            
                            return (
                              <TableRow
                                key={item.id}
                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                              >
                                <TableCell component="th" scope="row">
                                  #{item.installment_no}
                                </TableCell>
                                <TableCell>{new Date(item.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                                <TableCell align="right">₹{baseAmount.toLocaleString('en-IN')}</TableCell>
                                <TableCell align="right">
                                  <Typography color={penalty > 0 ? "error" : "text.secondary"}>
                                    ₹{penalty.toLocaleString('en-IN')}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  ₹{totalPayable.toLocaleString('en-IN')}
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
                                <TableCell>
                                  {item.paid_date ? new Date(item.paid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                </TableCell>
                                <TableCell align="right">
                                  {!item.paid && (
                                    <Button 
                                      size="small" 
                                      variant="contained" 
                                      color="primary"
                                      LinkComponent={Link}
                                      href={`/payments/collect?membership_id=${membership.id}&installment_id=${item.id}`}
                                    >
                                      Pay Now
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, lg: 5 }}>
                  <Card variant='outlined'><CardContent><Stack spacing={2}>
                    <Typography fontWeight={700}>Payments</Typography>
                    {membership.payments?.map(item => (
                      <Stack key={item.id} spacing={0.5}>
                        <Typography>{`₹${Number(item.amount || 0).toLocaleString('en-IN')} • ${item.status}`}</Typography>
                        <Typography variant='body2' color='text.secondary'>{`${new Date(item.payment_date).toLocaleDateString('en-IN')} • installment ${item.installment?.installment_no || '-'}`}</Typography>
                      </Stack>
                    ))}
                  </Stack></CardContent></Card>
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default MembershipDetailPage
