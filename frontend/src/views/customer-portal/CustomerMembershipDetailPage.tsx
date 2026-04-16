'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { customerPortalRequest } from '@/libs/customerPortal'

type MembershipDetailResponse = {
  data: {
    id: number
    membership_no?: string | null
    card_no?: string | null
    card_reference?: string | null
    maturity_date: string
    total_paid: string | number
    scheme?: {
      name: string
      code: string
      maturityBenefits?: Array<{ id: number; month: number; type: string; value: string | number }>
    } | null
    installments?: Array<{ id: number; installment_no: number; due_date: string; amount: string | number; paid: boolean; paid_date?: string | null }>
    payments?: Array<{ id: number; amount: string | number; payment_date: string; status: string; gateway?: string | null }>
  }
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const CustomerMembershipDetailPage = ({ membershipId }: { membershipId: number }) => {
  const [membership, setMembership] = useState<MembershipDetailResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await customerPortalRequest<MembershipDetailResponse>(`/customer-portal/memberships/${membershipId}`)
        setMembership(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load membership detail.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [membershipId])

  if (loading) {
    return (
      <Stack sx={{ minHeight: '100vh' }} alignItems='center' justifyContent='center'>
        <CircularProgress />
      </Stack>
    )
  }

  if (!membership) {
    return (
      <Stack sx={{ minHeight: '100vh', p: 4 }}>
        <Alert severity='error'>{error || 'Membership not found.'}</Alert>
      </Stack>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', p: { xs: 2, md: 4 } }}>
      <Stack spacing={4}>
        <Stack direction='row' justifyContent='space-between' alignItems='center'>
          <div>
            <Typography variant='h4'>{membership.scheme?.name || `Membership #${membership.id}`}</Typography>
            <Typography color='text.secondary'>
              {membership.scheme?.code || 'No scheme code'} • Card {membership.card_no || '-'} • Ref {membership.card_reference || '-'}
            </Typography>
          </div>
          <Button component={Link} href='/customer/panel' variant='outlined'>
            Back to Panel
          </Button>
        </Stack>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}><Card><CardContent><Typography color='text.secondary'>Membership No</Typography><Typography variant='h5'>{membership.membership_no || '-'}</Typography></CardContent></Card></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Card><CardContent><Typography color='text.secondary'>Maturity Date</Typography><Typography variant='h5'>{new Date(membership.maturity_date).toLocaleDateString('en-IN')}</Typography></CardContent></Card></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Card><CardContent><Typography color='text.secondary'>Total Paid</Typography><Typography variant='h5'>{currencyFormatter.format(Number(membership.total_paid || 0))}</Typography></CardContent></Card></Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant='h5'>All Installments</Typography>
                  {(membership.installments || []).map(installment => (
                    <Box key={installment.id} sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                      <Typography fontWeight={700}>
                        Installment {installment.installment_no} • {currencyFormatter.format(Number(installment.amount || 0))}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Due {new Date(installment.due_date).toLocaleDateString('en-IN')} • {installment.paid ? `Paid on ${installment.paid_date ? new Date(installment.paid_date).toLocaleDateString('en-IN') : 'recorded'}` : 'Pending'}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Stack spacing={3}>
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant='h5'>Payment History</Typography>
                    {(membership.payments || []).map(payment => (
                      <Box key={payment.id} sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                        <Typography fontWeight={700}>{currencyFormatter.format(Number(payment.amount || 0))}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {new Date(payment.payment_date).toLocaleDateString('en-IN')} • {payment.gateway || 'manual'} • {payment.status}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant='h5'>Maturity Benefits</Typography>
                    {(membership.scheme?.maturityBenefits || []).map(benefit => (
                      <Box key={benefit.id} sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                        <Typography fontWeight={700}>Month {benefit.month}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {benefit.type} • {benefit.type === 'percentage' ? `${benefit.value}%` : currencyFormatter.format(Number(benefit.value || 0))}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  )
}

export default CustomerMembershipDetailPage
