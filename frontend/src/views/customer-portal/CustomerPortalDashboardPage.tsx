'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { clearCustomerPortalToken, customerPortalRequest } from '@/libs/customerPortal'

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
    }
    memberships: PortalMembership[]
  }
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const CustomerPortalDashboardPage = () => {
  const router = useRouter()
  const [payload, setPayload] = useState<DashboardResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const logout = async () => {
    try {
      await customerPortalRequest('/customer-auth/logout', { method: 'POST' })
    } catch {
      // Best-effort logout.
    }

    clearCustomerPortalToken()
    router.replace('/customer/login')
  }

  if (!payload) {
    return (
      <Stack sx={{ minHeight: '100vh', p: 4 }}>
        <Alert severity='error'>{error || 'Customer data not found.'}</Alert>
      </Stack>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', p: { xs: 2, md: 4 } }}>
      <Stack spacing={4}>
        <Card sx={{ color: 'common.white', background: 'linear-gradient(135deg, #0f172a 0%, #155e75 55%, #f59e0b 100%)' }}>
          <CardContent sx={{ p: { xs: 4, md: 5 } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between'>
              <div>
                <Typography variant='overline' sx={{ letterSpacing: '0.14em', color: 'rgba(255,255,255,0.78)' }}>
                  Customer Panel
                </Typography>
                <Typography variant='h4'>{payload.customer.name || payload.customer.mobile}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                  {payload.customer.mobile} • {payload.customer.email || 'No email added'} • KYC {payload.customer.kyc?.status || 'pending'}
                </Typography>
              </div>
              <Stack direction='row' spacing={2}>
                <Button component={Link} href='/customer/login' variant='outlined' sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>
                  Switch Account
                </Button>
                <Button onClick={() => void logout()} variant='contained' color='warning'>
                  Logout
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {error ? <Alert severity='warning'>{error}</Alert> : null}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 3 }}><Card><CardContent><Typography color='text.secondary'>Memberships</Typography><Typography variant='h4'>{payload.summary.memberships_count}</Typography></CardContent></Card></Grid>
          <Grid size={{ xs: 12, md: 3 }}><Card><CardContent><Typography color='text.secondary'>Active</Typography><Typography variant='h4'>{payload.summary.active_memberships_count}</Typography></CardContent></Card></Grid>
          <Grid size={{ xs: 12, md: 3 }}><Card><CardContent><Typography color='text.secondary'>Total Paid</Typography><Typography variant='h4'>{currencyFormatter.format(payload.summary.total_paid)}</Typography></CardContent></Card></Grid>
          <Grid size={{ xs: 12, md: 3 }}><Card><CardContent><Typography color='text.secondary'>Pending Installments</Typography><Typography variant='h4'>{payload.summary.pending_installments_count}</Typography></CardContent></Card></Grid>
        </Grid>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <div>
                <Typography variant='h5'>Your Memberships</Typography>
                <Typography color='text.secondary'>Card, installment preview, and maturity benefits for each plan.</Typography>
              </div>

              {payload.memberships.length ? (
                <Stack spacing={3}>
                  {payload.memberships.map(membership => (
                    <Card key={membership.id} variant='outlined'>
                      <CardContent>
                        <Stack spacing={2}>
                          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
                            <div>
                              <Typography variant='h6'>{membership.scheme?.name || `Membership #${membership.id}`}</Typography>
                              <Typography color='text.secondary'>
                                {membership.scheme?.code || 'No scheme code'} • {membership.membership_no || 'Membership no pending'}
                              </Typography>
                            </div>
                            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                              <Chip label={membership.status} color={membership.status === 'active' ? 'success' : 'default'} />
                              <Chip label={`Card ${membership.card_no || 'Pending'}`} variant='outlined' />
                            </Stack>
                          </Stack>

                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography color='text.secondary'>Card Reference</Typography>
                              <Typography fontWeight={700}>{membership.card_reference || '-'}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography color='text.secondary'>Maturity Date</Typography>
                              <Typography fontWeight={700}>{new Date(membership.maturity_date).toLocaleDateString('en-IN')}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography color='text.secondary'>Total Paid</Typography>
                              <Typography fontWeight={700}>{currencyFormatter.format(Number(membership.total_paid || 0))}</Typography>
                            </Grid>
                          </Grid>

                          <Stack spacing={1}>
                            {(membership.installments || []).slice(0, 3).map(installment => (
                              <Box key={installment.id} sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                                <Typography fontWeight={700}>
                                  Installment {installment.installment_no} • {currencyFormatter.format(Number(installment.amount || 0))}
                                </Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  Due {new Date(installment.due_date).toLocaleDateString('en-IN')} • {installment.paid ? 'Paid' : 'Pending'}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>

                          <Stack direction='row' justifyContent='flex-end'>
                            <Button component={Link} href={`/customer/panel/memberships/${membership.id}`} variant='contained'>
                              View Full Details
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Alert severity='info'>No memberships are available for this customer yet.</Alert>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  )
}

export default CustomerPortalDashboardPage
