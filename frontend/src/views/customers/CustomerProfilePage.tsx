'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import {
  getCustomerLocationLabel,
  getCustomerName,
  getCustomerStatusColor,
  getKycStatusColor,
  resolveBackendApiUrl,
  type Customer,
  type CustomerResponse
} from './customerData'

type Membership = {
  id: number
  start_date: string
  maturity_date: string
  total_paid: string | number
  status: string
  scheme?: {
    id: number
    name: string
    code: string
    installment_value?: string | number | null
    total_installments?: number | null
    scheme_type?: string | null
    maturityBenefits?: Array<{
      id: number
      month: number
      type: string
      value: string | number
    }>
  } | null
  installments?: Array<{
    id: number
    installment_no: number
    due_date: string
    amount: string | number
    paid: boolean
    paid_date?: string | null
    penalty?: string | number | null
  }>
  payments?: Array<{
    id: number
    amount: string | number
    gateway?: string | null
    transaction_id?: string | null
    payment_date: string
    status: string
    installment?: {
      installment_no: number
    } | null
  }>
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const CustomerProfilePage = ({ customerId }: { customerId: number }) => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!accessToken) {
        throw new Error('Missing access token')
      }

      const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...(init?.headers || {})
        }
      })

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; errors?: Record<string, string[]> }
        | null

      if (!response.ok) {
        const validationMessage = payload?.errors
          ? Object.values(payload.errors)
              .flat()
              .join(' ')
          : null

        throw new Error(validationMessage || payload?.message || 'Request failed')
      }

      return payload as T
    },
    [accessToken]
  )

  useEffect(() => {
    if (status === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')

      return
    }

    if (status !== 'authenticated') return

    const loadCustomer = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await request<CustomerResponse>(`/customers/${customerId}`)

        setCustomer(response.data)
        setMemberships((response.data.memberships as Membership[] | undefined) || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customer profile.')
      } finally {
        setLoading(false)
      }
    }

    void loadCustomer()
  }, [status, accessToken, customerId, request])

  if (!customer) {
    return <Alert severity='error'>{error || 'Customer not found.'}</Alert>
  }

  const locationLabel = getCustomerLocationLabel(customer)
  const joinedOn = customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-IN') : 'Unknown'
  const kycStatus = customer.kyc?.status || 'pending'
  const totalPaid = memberships.reduce((sum, membership) => sum + Number(membership.total_paid || 0), 0)
  const totalPayments = memberships.reduce((sum, membership) => sum + (membership.payments?.length || 0), 0)
  const customerPayments = memberships
    .flatMap(membership =>
      (membership.payments || []).map(payment => ({
        ...payment,
        membershipId: membership.id,
        schemeName: membership.scheme?.name || 'No scheme',
        schemeCode: membership.scheme?.code || 'No code'
      }))
    )
    .sort((left, right) => new Date(right.payment_date).getTime() - new Date(left.payment_date).getTime())
  const upcomingMaturity = memberships
    .filter(membership => membership.maturity_date)
    .sort((left, right) => new Date(left.maturity_date).getTime() - new Date(right.maturity_date).getTime())[0]

  const handleDeleteCustomer = async () => {
    if (!confirm(`Delete ${getCustomerName(customer)}?`)) return

    setError(null)

    try {
      await request(`/customers/${customer.id}`, {
        method: 'DELETE'
      })
      router.push('/customers')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer.')
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            overflow: 'hidden',
            position: 'relative',
            color: 'common.white',
            background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 42%, #0f766e 100%)'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 6 } }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} justifyContent='space-between'>
              <div>
                <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ mb: 1.5 }}>
                  <Typography variant='h3' sx={{ color: 'common.white' }}>
                    {getCustomerName(customer)}
                  </Typography>
                  <Chip label={customer.status || 'blocked'} color={getCustomerStatusColor(customer.status)} size='small' />
                </Stack>
                <Typography sx={{ color: 'rgba(255,255,255,0.82)' }}>
                  {`Customer ID #${customer.id} • Joined on ${joinedOn}`}
                </Typography>
              </div>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button component={Link} href='/customers' variant='outlined' sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.3)' }}>
                  Back to Customers
                </Button>
                <Button component={Link} href={`/customers/${customer.id}/edit`} variant='contained' sx={{ bgcolor: 'common.white', color: '#0f4c81' }}>
                  Edit Customer
                </Button>
                <Button component={Link} href={`/customers/${customer.id}/kyc`} variant='outlined' sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.3)' }}>
                  Update KYC
                </Button>
                <Button component={Link} href={`/membership/create?customerId=${customer.id}`} variant='outlined' sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.3)' }}>
                  Enroll Membership
                </Button>
                <Button component={Link} href={`/payments/history?customer_id=${customer.id}`} variant='outlined' sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.3)' }}>
                  Payment History
                </Button>
                <Button
                  variant='outlined'
                  color='error'
                  onClick={() => void handleDeleteCustomer()}
                  sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'common.white' }}
                >
                  Delete Customer
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Stack spacing={6}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1.5} alignItems='flex-start'>
                    <Typography variant='body2' color='text.secondary'>
                      KYC Status
                    </Typography>
                    <Typography variant='h4'>
                      {kycStatus === 'pending' ? 'KYC Pending' : kycStatus.toUpperCase()}
                    </Typography>
                    <Chip
                      label={kycStatus === 'pending' ? 'Needs review' : kycStatus}
                      color={getKycStatusColor(kycStatus)}
                      variant='tonal'
                      size='small'
                    />
                    <Button component={Link} href={`/customers/${customer.id}/kyc`} variant='contained' size='small'>
                      KYC Update
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Stack spacing={3}>
                <div>
                  <Typography variant='h5'>Profile Snapshot</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Customer identity and linked user information.
                  </Typography>
                </div>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Full name
                    </Typography>
                    <Typography fontWeight={700}>{getCustomerName(customer)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Mobile
                    </Typography>
                    <Typography fontWeight={700}>{customer.mobile}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Email
                    </Typography>
                    <Typography fontWeight={700}>{customer.email || 'Not provided'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant='body2' color='text.secondary'>
                      Membership readiness
                    </Typography>
                    <Typography fontWeight={700}>{customer.kyc?.status === 'approved' ? 'Ready for scheme enrollment' : 'KYC approval required'}</Typography>
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={2.5}>
                <div>
                  <Typography variant='h5'>KYC & Address</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Verification progress and location completeness.
                  </Typography>
                </div>

                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    KYC review
                  </Typography>
                  <Typography fontWeight={700}>
                    {kycStatus === 'pending' ? 'KYC Pending' : kycStatus}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    City / State
                  </Typography>
                  <Typography fontWeight={700}>{locationLabel}</Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    Address
                  </Typography>
                  <Typography fontWeight={700}>{customer.kyc?.address || 'Location Pending'}</Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    Pincode
                  </Typography>
                  <Typography fontWeight={700}>{customer.kyc?.pincode || 'Pending'}</Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    KYC remarks
                  </Typography>
                  <Typography fontWeight={700}>{customer.kyc?.remarks || 'No remarks yet'}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Stack spacing={6}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant='body2' color='text.secondary'>
                    Total Paid
                  </Typography>
                  <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>
                    {currencyFormatter.format(totalPaid)}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Across all memberships
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant='body2' color='text.secondary'>
                    Payment Entries
                  </Typography>
                  <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>
                    {totalPayments}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Logged payment records
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant='body2' color='text.secondary'>
                    Next Maturity
                  </Typography>
                  <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>
                    {upcomingMaturity ? new Date(upcomingMaturity.maturity_date).toLocaleDateString('en-IN') : '--'}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Earliest maturity in portfolio
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Stack spacing={3}>
                <div>
                  <Typography variant='h5'>Membership Portfolio</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Schemes, maturity dates, installment progress, and collection summary for this customer.
                  </Typography>
                </div>

                {!memberships.length ? (
                  <Alert severity='info'>No memberships linked to this customer yet.</Alert>
                ) : (
                  <Stack spacing={3}>
                    {memberships.map(membership => {
                      const paidInstallments = membership.installments?.filter(item => item.paid).length || 0
                      const totalInstallments = membership.installments?.length || membership.scheme?.total_installments || 0
                      const latestPayment = membership.payments?.[0]
                      const maturityBenefits = membership.scheme?.maturityBenefits || []

                      return (
                        <Card
                          key={membership.id}
                          variant='outlined'
                          sx={{
                            borderColor: 'divider',
                            background: 'linear-gradient(135deg, rgba(15,23,42,0.015) 0%, rgba(29,78,216,0.04) 100%)'
                          }}
                        >
                          <CardContent>
                            <Stack spacing={2.5}>
                              <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                justifyContent='space-between'
                                alignItems={{ xs: 'flex-start', md: 'center' }}
                                spacing={2}
                              >
                                <div>
                                  <Typography variant='h5'>{membership.scheme?.name || `Membership #${membership.id}`}</Typography>
                                  <Typography variant='body2' color='text.secondary'>
                                    {`${membership.scheme?.code || 'No scheme code'} • ${membership.scheme?.scheme_type || 'Scheme type pending'}`}
                                  </Typography>
                                </div>
                                <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                                  <Chip label={membership.status} size='small' variant='tonal' color={membership.status === 'active' ? 'success' : 'default'} />
                                  <Chip label={`Paid ${paidInstallments}/${totalInstallments}`} size='small' variant='outlined' />
                                </Stack>
                              </Stack>

                              <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 4 }}>
                                  <Typography variant='body2' color='text.secondary'>
                                    Total paid
                                  </Typography>
                                  <Typography fontWeight={700}>{currencyFormatter.format(Number(membership.total_paid || 0))}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }}>
                                  <Typography variant='body2' color='text.secondary'>
                                    Start / Maturity
                                  </Typography>
                                  <Typography fontWeight={700}>
                                    {`${new Date(membership.start_date).toLocaleDateString('en-IN')} • ${new Date(membership.maturity_date).toLocaleDateString('en-IN')}`}
                                  </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }}>
                                  <Typography variant='body2' color='text.secondary'>
                                    Installment value
                                  </Typography>
                                  <Typography fontWeight={700}>
                                    {currencyFormatter.format(Number(membership.scheme?.installment_value || 0))}
                                  </Typography>
                                </Grid>
                              </Grid>

                              <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                                    Recent payments
                                  </Typography>
                                  {!membership.payments?.length ? (
                                    <Typography color='text.secondary'>No payments recorded yet.</Typography>
                                  ) : (
                                    <Stack spacing={1.25}>
                                      {membership.payments.slice(0, 3).map(payment => (
                                        <Box key={payment.id} sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                                          <Typography fontWeight={700}>{currencyFormatter.format(Number(payment.amount || 0))}</Typography>
                                          <Typography variant='body2' color='text.secondary'>
                                            {`${new Date(payment.payment_date).toLocaleDateString('en-IN')} • installment #${payment.installment?.installment_no || '-'} • ${payment.gateway || 'Manual'} • ${payment.status}`}
                                          </Typography>
                                          <Button component={Link} href={`/payments/receipt/${payment.id}`} variant='text' size='small' sx={{ mt: 1, px: 0 }}>
                                            View Receipt
                                          </Button>
                                        </Box>
                                      ))}
                                    </Stack>
                                  )}
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                                    Maturity benefits
                                  </Typography>
                                  {!maturityBenefits.length ? (
                                    <Typography color='text.secondary'>No maturity benefit rules configured for this scheme.</Typography>
                                  ) : (
                                    <Stack spacing={1.25}>
                                      {maturityBenefits.slice(0, 4).map(benefit => (
                                        <Box key={benefit.id} sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                                          <Typography fontWeight={700}>{`Month ${benefit.month}`}</Typography>
                                          <Typography variant='body2' color='text.secondary'>
                                            {`${benefit.type} • ${benefit.type === 'percentage' ? `${benefit.value}%` : currencyFormatter.format(Number(benefit.value || 0))}`}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Stack>
                                  )}
                                </Grid>
                              </Grid>

                              <Box>
                                <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                                  Latest payment snapshot
                                </Typography>
                                <Typography fontWeight={700}>
                                  {latestPayment
                                    ? `${currencyFormatter.format(Number(latestPayment.amount || 0))} on ${new Date(latestPayment.payment_date).toLocaleDateString('en-IN')}`
                                    : 'No payment snapshot available'}
                                </Typography>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
                  <div>
                    <Typography variant='h5'>Customer Payment History</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Aggregated collections across all memberships with installment mapping.
                    </Typography>
                  </div>
                  <Button component={Link} href={`/payments/history?customer_id=${customer.id}`} variant='outlined'>
                    Open Full Ledger
                  </Button>
                </Stack>

                {!customerPayments.length ? (
                  <Alert severity='info'>No payments recorded for this customer yet.</Alert>
                ) : (
                  <Stack spacing={1.5}>
                    {customerPayments.slice(0, 8).map(payment => (
                      <Box key={payment.id} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
                          <div>
                            <Typography fontWeight={700}>{currencyFormatter.format(Number(payment.amount || 0))}</Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {`${new Date(payment.payment_date).toLocaleDateString('en-IN')} • ${payment.schemeName} (${payment.schemeCode}) • Membership #${payment.membershipId}`}
                            </Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {`Installment #${payment.installment?.installment_no || '-'} • ${payment.gateway || 'Manual'} • ${payment.transaction_id || 'No reference id'} • ${payment.status}`}
                            </Typography>
                          </div>
                          <Stack direction='row' spacing={1}>
                            <Button component={Link} href={`/membership/${payment.membershipId}`} variant='outlined' size='small'>
                              Membership
                            </Button>
                            <Button component={Link} href={`/payments/receipt/${payment.id}`} variant='contained' size='small'>
                              Receipt
                            </Button>
                          </Stack>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  )
}

export default CustomerProfilePage
