'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import { alpha, useTheme } from '@mui/material/styles'

import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'

import {
  getCustomerLocationLabel,
  getCustomerName,
  getCustomerStatusColor,
  getKycStatusColor,
  resolveBackendApiUrl,
  type Customer,
  type CustomerResponse,
  type MergeHistoryEntry,
  type RelativeAccount,
  type RelativeRequest,
  type SiblingProfile
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
    receipt_id?: number | null
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

/* ──── Skeleton Loader ──── */
const CustomerProfileSkeleton = () => (
  <Grid container spacing={6}>
    <Grid size={{ xs: 12 }}>
      <Skeleton variant='rectangular' height={220} sx={{ borderRadius: 3 }} />
    </Grid>
    <Grid size={{ xs: 12, lg: 4 }}>
      <Stack spacing={4}>
        <Skeleton variant='rectangular' height={160} sx={{ borderRadius: 3 }} />
        <Skeleton variant='rectangular' height={280} sx={{ borderRadius: 3 }} />
        <Skeleton variant='rectangular' height={320} sx={{ borderRadius: 3 }} />
      </Stack>
    </Grid>
    <Grid size={{ xs: 12, lg: 8 }}>
      <Stack spacing={4}>
        <Grid container spacing={3}>
          {[1, 2, 3].map(i => (
            <Grid key={i} size={{ xs: 12, md: 4 }}>
              <Skeleton variant='rectangular' height={130} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rectangular' height={400} sx={{ borderRadius: 3 }} />
      </Stack>
    </Grid>
  </Grid>
)

/* ──── Circular Progress Ring ──── */
const ProgressRing = ({
  value,
  size = 56,
  strokeWidth = 5,
  color = '#6366f1'
}: {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          stroke='rgba(99,102,241,0.12)'
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap='round'
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant='caption' fontWeight={800} sx={{ fontSize: '0.7rem' }}>
          {Math.round(value)}%
        </Typography>
      </Box>
    </Box>
  )
}

/* ──── Info Row Helper ──── */
const InfoRow = ({
  icon,
  label,
  value,
  divider = true
}: {
  icon: string
  label: string
  value: string
  divider?: boolean
}) => (
  <>
    <Stack direction='row' spacing={2} alignItems='flex-start' sx={{ py: 1.5 }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
          fontSize: '1rem',
          flexShrink: 0
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.68rem' }}>
          {label}
        </Typography>
        <Typography fontWeight={600} sx={{ wordBreak: 'break-word' }}>
          {value}
        </Typography>
      </Box>
    </Stack>
    {divider && <Divider sx={{ opacity: 0.5 }} />}
  </>
)

/* ──── Stat Card ──── */
const StatCard = ({
  label,
  value,
  subtitle,
  accentColor,
  icon
}: {
  label: string
  value: string
  subtitle: string
  accentColor: string
  icon: string
}) => {
  const theme = useTheme()

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'visible',
        borderRadius: 3,
        transition: 'transform 0.25s cubic-bezier(.4,0,.2,1), box-shadow 0.25s cubic-bezier(.4,0,.2,1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 40px ${alpha(accentColor, 0.18)}`
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          borderRadius: '12px 12px 0 0',
          background: `linear-gradient(90deg, ${accentColor}, ${alpha(accentColor, 0.5)})`
        }
      }}
    >
      <CardContent sx={{ p: { xs: 3, sm: 4 }, pt: { xs: 4, sm: 5 } }}>
        <Stack spacing={1.5}>
          <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
            <Typography variant='body2' color='text.secondary' fontWeight={500}>
              {label}
            </Typography>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(accentColor, theme.palette.mode === 'dark' ? 0.16 : 0.08),
                fontSize: '1.25rem'
              }}
            >
              {icon}
            </Box>
          </Stack>
          <Typography variant='h4' fontWeight={800} sx={{ letterSpacing: -0.5 }}>
            {value}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {subtitle}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}

/* ──── Main Component ──── */
const CustomerProfilePage = ({ customerId }: { customerId: number }) => {
  const router = useRouter()
  const theme = useTheme()
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [relativeAccounts, setRelativeAccounts] = useState<RelativeAccount[]>([])
  const [relativeRequests, setRelativeRequests] = useState<RelativeRequest[]>([])
  const [mergeHistory, setMergeHistory] = useState<MergeHistoryEntry[]>([])
  const [undoingMergeId, setUndoingMergeId] = useState<number | null>(null)
  const [undoError, setUndoError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)

  // Add Linked Profile (same mobile) dialog
  const [linkedProfileDialogOpen, setLinkedProfileDialogOpen] = useState(false)
  const [linkedProfileError, setLinkedProfileError] = useState<string | null>(null)
  const [relativeSearch, setRelativeSearch] = useState('')
  const [relativeSearching, setRelativeSearching] = useState(false)
  const [relativeResults, setRelativeResults] = useState<Customer[]>([])
  const [relativeTargets, setRelativeTargets] = useState<Customer[]>([])
  const [savingRelativeRequest, setSavingRelativeRequest] = useState(false)
  const relativeSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const loadCustomer = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await request<CustomerResponse>(`/customers/${customerId}`)

      setCustomer(response.data)
      setMemberships((response.data.memberships as Membership[] | undefined) || [])
      setRelativeAccounts(response.relative_accounts || [])
      setRelativeRequests(response.relative_requests || [])
      setMergeHistory(response.merge_history || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer profile.')
    } finally {
      setLoading(false)
    }
  }, [request, customerId])

  useEffect(() => {
    if (status === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')

      return
    }

    if (status !== 'authenticated') return

    void loadCustomer()
  }, [status, accessToken, loadCustomer])

  if (loading) {
    return <CustomerProfileSkeleton />
  }

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

  const searchRelativeCandidates = async (query: string) => {
    setRelativeSearching(true)

    try {
      const response = await request<{ data: Customer[] }>(
        `/customers?per_page=10&search=${encodeURIComponent(query)}`
      )

      setRelativeResults((response.data || []).filter(c => c.id !== customer?.id))
    } catch (err) {
      setLinkedProfileError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      setRelativeSearching(false)
    }
  }

  const toggleRelativeTarget = (target: Customer) => {
    setRelativeTargets(prev =>
      prev.some(item => item.id === target.id)
        ? prev.filter(item => item.id !== target.id)
        : [...prev, target]
    )
  }

  const handleAddRelativeRequest = async () => {
    if (!customer) return

    setSavingRelativeRequest(true)
    setLinkedProfileError(null)

    try {
      await request(`/customers/${customer.id}/relative-requests`, {
        method: 'POST',
        body: JSON.stringify({
          relative_customer_ids: relativeTargets.map(target => target.id)
        })
      })

      setLinkedProfileDialogOpen(false)
      setRelativeTargets([])
      setRelativeSearch('')
      setRelativeResults([])
      await loadCustomer()
    } catch (err) {
      setLinkedProfileError(err instanceof Error ? err.message : 'Failed to send relative request.')
    } finally {
      setSavingRelativeRequest(false)
    }
  }

  const handleUndoMerge = async (mergeId: number) => {
    if (!confirm('Undo this merge? The absorbed customer, their subscriptions, and their KYC data will be restored exactly as they were before the merge.')) return

    setUndoingMergeId(mergeId)
    setUndoError(null)

    try {
      await request(`/customer-merges/${mergeId}/undo`, { method: 'POST' })
      await loadCustomer()
    } catch (err) {
      setUndoError(err instanceof Error ? err.message : 'Failed to undo merge.')
    } finally {
      setUndoingMergeId(null)
    }
  }

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

  const customerInitials = getCustomerName(customer)
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const activeMemberships = memberships.filter(m => m.status === 'active').length
  const isDark = theme.palette.mode === 'dark'

  return (
    <>
    <Grid container spacing={5}>
      {/* ──── Hero Banner ──── */}
      <Grid size={{ xs: 12 }}>
        <Card
          id='customer-hero-banner'
          sx={{
            overflow: 'hidden',
            position: 'relative',
            borderRadius: 4,
            color: 'common.white',
            background: isDark
              ? 'linear-gradient(135deg, #0c0a1a 0%, #1a1145 30%, #2d1b69 55%, #1e3a5f 80%, #0d2137 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 25%, #1d4ed8 50%, #7c3aed 75%, #0f766e 100%)',
            backgroundSize: '200% 200%',
            animation: 'heroGradientShift 12s ease infinite',
            '@keyframes heroGradientShift': {
              '0%': { backgroundPosition: '0% 50%' },
              '50%': { backgroundPosition: '100% 50%' },
              '100%': { backgroundPosition: '0% 50%' }
            }
          }}
        >
          {/* Subtle mesh overlay */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0.07,
              backgroundImage:
                'radial-gradient(circle at 20% 30%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 70%, #fff 1px, transparent 1px)',
              backgroundSize: '60px 60px'
            }}
          />

          <CardContent sx={{ position: 'relative', p: { xs: 4, md: 6 } }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={4} justifyContent='space-between' alignItems={{ lg: 'center' }}>
              {/* Left — Avatar + Identity */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
                <Avatar
                  src={customer.image || undefined}
                  sx={{
                    width: 80,
                    height: 80,
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    bgcolor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(12px)',
                    border: '3px solid rgba(255,255,255,0.25)',
                    boxShadow: '0 0 24px rgba(99,102,241,0.35)',
                    color: 'common.white'
                  }}
                >
                  {customerInitials}
                </Avatar>
                <Box>
                  <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap sx={{ mb: 0.75 }}>
                    <Typography variant='h4' fontWeight={800} sx={{ color: 'common.white', letterSpacing: -0.5 }}>
                      {getCustomerName(customer)}
                    </Typography>
                    <Chip
                      label={customer.status || 'blocked'}
                      color={getCustomerStatusColor(customer.status)}
                      size='small'
                      sx={{
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        backdropFilter: 'blur(8px)'
                      }}
                    />
                    <Chip
                      label={`KYC: ${kycStatus}`}
                      color={getKycStatusColor(kycStatus)}
                      size='small'
                      variant='outlined'
                      sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.35)', fontWeight: 500 }}
                    />
                  </Stack>
                  <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9rem' }}>
                    {`ID #${customer.id}  •  Joined ${joinedOn}  •  ${locationLabel}`}
                  </Typography>
                  {customer.mobile && (
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', mt: 0.5 }}>
                      {`📱 ${customer.mobile}`}
                      {customer.alternate_mobile ? ` / ${customer.alternate_mobile}` : ''}
                      {customer.email ? `  •  ✉️ ${customer.email}` : ''}
                    </Typography>
                  )}
                </Box>
              </Stack>

              {/* Right — Actions */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap='wrap' useFlexGap>
                <Button
                  component={Link}
                  href='/customers'
                  variant='outlined'
                  size='small'
                  sx={{
                    color: 'common.white',
                    borderColor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(8px)',
                    bgcolor: 'rgba(255,255,255,0.06)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.4)' }
                  }}
                >
                  ← All Customers
                </Button>
                <Button
                  component={Link}
                  href={`/customers/${customer.id}/edit`}
                  variant='contained'
                  size='small'
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.92)',
                    color: '#1e3a5f',
                    fontWeight: 700,
                    '&:hover': { bgcolor: 'common.white' }
                  }}
                >
                  ✏️ Edit
                </Button>
                <Button
                  component={Link}
                  href={`/membership/create?customerId=${customer.id}`}
                  variant='outlined'
                  size='small'
                  sx={{
                    color: 'common.white',
                    borderColor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(8px)',
                    bgcolor: 'rgba(255,255,255,0.06)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.4)' }
                  }}
                >
                  + Membership
                </Button>
                <Button
                  component={Link}
                  href={`/payments?customer_id=${customer.id}`}
                  variant='outlined'
                  size='small'
                  sx={{
                    color: 'common.white',
                    borderColor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(8px)',
                    bgcolor: 'rgba(255,255,255,0.06)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.4)' }
                  }}
                >
                  💰 Payments
                </Button>
                <Button
                  variant='outlined'
                  size='small'
                  onClick={() => void handleDeleteCustomer()}
                  sx={{
                    color: '#fca5a5',
                    borderColor: 'rgba(252,165,165,0.3)',
                    '&:hover': { bgcolor: 'rgba(239,68,68,0.15)', borderColor: '#f87171' }
                  }}
                >
                  🗑 Delete
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* ──── Left Column ──── */}
      <Grid size={{ xs: 12, lg: 4 }}>
        <Stack spacing={4}>
          {/* Profile Snapshot Card */}
          <Card id='profile-snapshot' sx={{ borderRadius: 3, overflow: 'visible' }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack spacing={0.5} sx={{ mb: 3 }}>
                <Typography variant='h6' fontWeight={700}>
                  Profile Snapshot
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Identity & contact details
                </Typography>
              </Stack>

              <InfoRow icon='👤' label='Full Name' value={getCustomerName(customer)} />
              <InfoRow
                icon='📱'
                label='Mobile'
                value={customer.alternate_mobile ? `${customer.mobile} / ${customer.alternate_mobile}` : customer.mobile}
              />
              <InfoRow icon='✉️' label='Email' value={customer.email || 'Not provided'} />
              <InfoRow icon='🏷️' label='Category' value={customer.category || 'General'} />
              {customer.loyalty_card_no && (
                <InfoRow icon='💳' label='Loyalty Card' value={customer.loyalty_card_no} />
              )}
              <InfoRow
                icon='✅'
                label='Membership Readiness'
                value={customer.kyc?.status === 'approved' ? 'Ready for enrollment' : 'KYC approval required'}
                divider={!!customer.feedback}
              />
              {customer.feedback && (
                <InfoRow icon='📝' label='Notes / Feedback' value={customer.feedback} divider={false} />
              )}
            </CardContent>
          </Card>

          {/* KYC & Address Card */}
          <Card id='kyc-address-card' sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 3 }}>
                <Box>
                  <Typography variant='h6' fontWeight={700}>
                    KYC & Address
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Verification & location
                  </Typography>
                </Box>
                <Chip
                  label={kycStatus === 'pending' ? 'Pending' : kycStatus}
                  color={getKycStatusColor(kycStatus)}
                  variant='tonal'
                  size='small'
                  sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                />
              </Stack>

              <InfoRow icon='🔍' label='KYC Review' value={kycStatus === 'pending' ? 'KYC Pending' : kycStatus} />
              <InfoRow icon='🏙️' label='City / State' value={locationLabel} />
              <InfoRow icon='📍' label='Address' value={customer.kyc?.address || 'Location Pending'} />
              <InfoRow icon='📮' label='Pincode' value={customer.kyc?.pincode || 'Pending'} />
              {customer.kyc?.aadhaar_number && (
                <InfoRow icon='🪪' label='Aadhaar' value={customer.kyc.aadhaar_number.replace(/(\d{4})(\d{4})(\d{4})/, '$1 •••• $3')} />
              )}
              {customer.kyc?.pan_number && (
                <InfoRow icon='📄' label='PAN' value={customer.kyc.pan_number} />
              )}
              <InfoRow
                icon='💬'
                label='KYC Remarks'
                value={customer.kyc?.remarks || 'No remarks yet'}
                divider={false}
              />
            </CardContent>
          </Card>

          {/* Relative Accounts Card */}
          <Card id='family-account-card' sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 3 }}>
                <Box>
                  <Typography variant='h6' fontWeight={700}>
                    Relative Accounts
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Other customer profiles using the same mobile number
                  </Typography>
                </Box>
                <Button
                  size='small'
                  variant='outlined'
                  onClick={() => {
                    setLinkedProfileError(null)
                    setRelativeSearch('')
                    setRelativeResults([])
                    setRelativeTargets([])
                    setLinkedProfileDialogOpen(true)
                  }}
                >
                  + Add Relative
                </Button>
              </Stack>

              <Typography variant='caption' color='text.secondary' sx={{ mb: 2, display: 'block' }}>
                Search an existing customer, send a request, and the other customer can approve it in the portal.
              </Typography>

              {relativeAccounts.length === 0 ? (
                <Alert severity='info' sx={{ borderRadius: 2, mb: 2 }}>
                  No approved relative accounts yet.
                </Alert>
              ) : (
                <List disablePadding sx={{ mb: 2 }}>
                  {relativeAccounts.map(relative => (
                    <ListItemButton
                      key={relative.request_id}
                      component={Link}
                      href={`/customers/${relative.customer.id}`}
                      sx={{
                        borderRadius: 2,
                        mb: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          borderColor: 'primary.light'
                        }
                      }}
                    >
                      <ListItemText
                        primary={relative.customer.name || 'Unnamed customer'}
                        secondary={[
                          relative.customer.mobile,
                          relative.customer.loyalty_card_no ? `Card: ${relative.customer.loyalty_card_no}` : null
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      />
                      <Stack direction='row' spacing={1} alignItems='center' sx={{ flexShrink: 0 }}>
                        <Chip label='Approved' size='small' color='success' />
                        <Typography variant='caption' color='primary.main' fontWeight={700}>
                          Details →
                        </Typography>
                      </Stack>
                    </ListItemButton>
                  ))}
                </List>
              )}

              {relativeRequests.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant='subtitle2' sx={{ mb: 1 }}>
                    Pending Requests
                  </Typography>
                  <List disablePadding>
                    {relativeRequests.map(relative => (
                      <ListItemButton
                        key={relative.id}
                        component={Link}
                        href={`/customers/${relative.customer.id}`}
                        sx={{
                          borderRadius: 2,
                          mb: 1,
                          border: '1px solid',
                          borderColor: 'warning.light',
                          bgcolor: 'warning.lighter'
                        }}
                      >
                        <ListItemText
                          primary={relative.customer.name || 'Unnamed customer'}
                          secondary={[
                            relative.customer.mobile,
                            relative.direction === 'incoming' ? 'Waiting for your approval' : 'Requested by you'
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        />
                        <Chip
                          label={relative.direction === 'incoming' ? 'Pending approval' : 'Requested'}
                          size='small'
                          color='warning'
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              )}

              {relativeAccounts.length === 0 && relativeRequests.length === 0 ? (
                <List disablePadding>
                  <ListItemButton
                    onClick={() => {
                      setLinkedProfileError(null)
                      setRelativeSearch('')
                      setRelativeResults([])
                      setRelativeTargets([])
                      setLinkedProfileDialogOpen(true)
                    }}
                    sx={{ borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}
                  >
                    <ListItemText primary='Add a relative account' secondary='Search a customer and send an approval request.' />
                  </ListItemButton>
                </List>
              ) : null}
            </CardContent>
          </Card>

          {/* Merge History Card */}
          {mergeHistory.length > 0 && (
            <Card id='merge-history-card' sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Typography variant='h6' fontWeight={700}>
                  Merge History
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                  Duplicate customers absorbed into this record
                </Typography>

                {undoError && (
                  <Alert severity='error' sx={{ mb: 2 }} onClose={() => setUndoError(null)}>
                    {undoError}
                  </Alert>
                )}

                <List disablePadding>
                  {mergeHistory.map(entry => (
                    <Box
                      key={entry.id}
                      sx={{
                        borderRadius: 2,
                        mb: 1.5,
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={600}>
                            {entry.duplicate_name || entry.duplicate_customer?.name || 'Unnamed customer'}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {entry.duplicate_mobile || entry.duplicate_customer?.mobile}
                            {entry.created_at ? ` • Merged ${new Date(entry.created_at).toLocaleDateString('en-IN')}` : ''}
                          </Typography>
                        </Box>
                        {entry.reversed_at ? (
                          <Chip label='Undone' size='small' color='default' />
                        ) : (
                          <Button
                            size='small'
                            variant='outlined'
                            color='warning'
                            disabled={undoingMergeId === entry.id}
                            onClick={() => void handleUndoMerge(entry.id)}
                            startIcon={undoingMergeId === entry.id ? <CircularProgress size={14} color='inherit' /> : undefined}
                          >
                            {undoingMergeId === entry.id ? 'Undoing...' : 'Undo'}
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Nominee Card */}
          {customer.kyc?.nominee_name && (
            <Card id='nominee-card' sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Typography variant='h6' fontWeight={700} sx={{ mb: 2 }}>
                  Nominee Details
                </Typography>
                <InfoRow icon='👥' label='Nominee Name' value={customer.kyc.nominee_name} />
                <InfoRow icon='🤝' label='Relation' value={customer.kyc.nominee_relation || 'Not specified'} />
                <InfoRow
                  icon='📱'
                  label='Nominee Mobile'
                  value={customer.kyc.nominee_mobile_1 || 'Not provided'}
                  divider={false}
                />
              </CardContent>
            </Card>
          )}
        </Stack>
      </Grid>

      {/* ──── Right Column ──── */}
      <Grid size={{ xs: 12, lg: 8 }}>
        <Stack spacing={4}>
          {/* Stat Cards Row */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                label='Total Paid'
                value={currencyFormatter.format(totalPaid)}
                subtitle='All memberships'
                accentColor='#6366f1'
                icon='💎'
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                label='Payments'
                value={String(totalPayments)}
                subtitle='Logged entries'
                accentColor='#10b981'
                icon='📊'
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                label='Memberships'
                value={`${activeMemberships}/${memberships.length}`}
                subtitle='Active / total'
                accentColor='#f59e0b'
                icon='🏅'
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                label='Next Maturity'
                value={upcomingMaturity ? new Date(upcomingMaturity.maturity_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '--'}
                subtitle='Earliest in portfolio'
                accentColor='#ec4899'
                icon='📅'
              />
            </Grid>
          </Grid>

          {/* Tabbed Content Section */}
          <Card sx={{ borderRadius: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: { xs: 2, sm: 3 } }}>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                variant='scrollable'
                scrollButtons='auto'
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    minHeight: 52
                  }
                }}
              >
                <Tab label={`Memberships (${memberships.length})`} />
                <Tab label={`Payment History (${customerPayments.length})`} />
              </Tabs>
            </Box>

            <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
              {/* ── Tab 0: Membership Portfolio ── */}
              {activeTab === 0 && (
                <Stack spacing={3}>
                  {!memberships.length ? (
                    <Alert severity='info' sx={{ borderRadius: 2 }}>
                      No memberships linked to this customer yet.
                    </Alert>
                  ) : (
                    memberships.map(membership => {
                      const paidInstallments = membership.installments?.filter(item => item.paid).length || 0
                      const totalInstallments = membership.installments?.length || membership.scheme?.total_installments || 0
                      const progressPercent = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0
                      const latestPayment = membership.payments?.[0]
                      const maturityBenefits = membership.scheme?.maturityBenefits || []
                      const isActive = membership.status === 'active'

                      return (
                        <Card
                          key={membership.id}
                          variant='outlined'
                          sx={{
                            borderRadius: 3,
                            borderColor: isActive ? alpha('#6366f1', 0.25) : 'divider',
                            transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
                            '&:hover': {
                              borderColor: isActive ? alpha('#6366f1', 0.5) : alpha(theme.palette.text.primary, 0.2),
                              boxShadow: `0 4px 20px ${alpha('#6366f1', 0.08)}`
                            }
                          }}
                        >
                          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                            <Stack spacing={3}>
                              {/* Header row */}
                              <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                justifyContent='space-between'
                                alignItems={{ xs: 'flex-start', md: 'center' }}
                                spacing={2}
                              >
                                <Stack direction='row' spacing={2} alignItems='center'>
                                  <ProgressRing
                                    value={progressPercent}
                                    color={isActive ? '#6366f1' : '#94a3b8'}
                                  />
                                  <Box>
                                    <Typography variant='h6' fontWeight={700}>
                                      {membership.scheme?.name || `Membership #${membership.id}`}
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary'>
                                      {`${membership.scheme?.code || 'No scheme code'} • ${membership.scheme?.scheme_type || 'Type pending'}`}
                                    </Typography>
                                  </Box>
                                </Stack>
                                <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                                  <Chip
                                    label={membership.status}
                                    size='small'
                                    variant='tonal'
                                    color={isActive ? 'success' : 'default'}
                                    sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                                  />
                                  <Chip
                                    label={`${paidInstallments}/${totalInstallments} Paid`}
                                    size='small'
                                    variant='outlined'
                                  />
                                </Stack>
                              </Stack>

                              {/* Progress bar */}
                              <Box>
                                <LinearProgress
                                  variant='determinate'
                                  value={progressPercent}
                                  sx={{
                                    height: 6,
                                    borderRadius: 3,
                                    bgcolor: alpha('#6366f1', 0.08),
                                    '& .MuiLinearProgress-bar': {
                                      borderRadius: 3,
                                      background: isActive
                                        ? 'linear-gradient(90deg, #6366f1, #a78bfa)'
                                        : '#94a3b8'
                                    }
                                  }}
                                />
                              </Box>

                              {/* Quick stats grid */}
                              <Grid container spacing={2}>
                                <Grid size={{ xs: 6, md: 3 }}>
                                  <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                                    Total Paid
                                  </Typography>
                                  <Typography fontWeight={700} sx={{ fontSize: '1rem' }}>
                                    {currencyFormatter.format(Number(membership.total_paid || 0))}
                                  </Typography>
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                  <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                                    Installment
                                  </Typography>
                                  <Typography fontWeight={700} sx={{ fontSize: '1rem' }}>
                                    {currencyFormatter.format(Number(membership.scheme?.installment_value || 0))}
                                  </Typography>
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                  <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                                    Start Date
                                  </Typography>
                                  <Typography fontWeight={700} sx={{ fontSize: '1rem' }}>
                                    {new Date(membership.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                  </Typography>
                                </Grid>
                                <Grid size={{ xs: 6, md: 3 }}>
                                  <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                                    Maturity
                                  </Typography>
                                  <Typography fontWeight={700} sx={{ fontSize: '1rem' }}>
                                    {new Date(membership.maturity_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                  </Typography>
                                </Grid>
                              </Grid>

                              {/* Benefits & Recent Payments */}
                              <Grid container spacing={3}>
                                {/* Recent payments */}
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.68rem', mb: 1.5, display: 'block' }}>
                                    Recent Payments
                                  </Typography>
                                  {!membership.payments?.length ? (
                                    <Typography variant='body2' color='text.secondary' sx={{ fontStyle: 'italic' }}>
                                      No payments recorded yet.
                                    </Typography>
                                  ) : (
                                    <Stack spacing={1}>
                                      {membership.payments.slice(0, 3).map(payment => (
                                        <Box
                                          key={payment.id}
                                          sx={{
                                            p: 2,
                                            borderRadius: 2.5,
                                            bgcolor: 'action.hover',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            transition: 'background-color 0.2s',
                                            '&:hover': { bgcolor: 'action.selected' }
                                          }}
                                        >
                                          <Stack direction='row' justifyContent='space-between' alignItems='center'>
                                            <Box>
                                              <Typography fontWeight={700} sx={{ fontSize: '0.95rem' }}>
                                                {currencyFormatter.format(Number(payment.amount || 0))}
                                              </Typography>
                                              <Typography variant='caption' color='text.secondary'>
                                                {`${new Date(payment.payment_date).toLocaleDateString('en-IN')} • #${payment.installment?.installment_no || '-'} • ${payment.gateway || 'Manual'}`}
                                              </Typography>
                                            </Box>
                                            <Chip
                                              label={payment.status}
                                              size='small'
                                              color={payment.status === 'completed' || payment.status === 'success' ? 'success' : 'default'}
                                              variant='tonal'
                                              sx={{ fontSize: '0.7rem', height: 22 }}
                                            />
                                          </Stack>
                                        </Box>
                                      ))}
                                    </Stack>
                                  )}
                                </Grid>

                                {/* Maturity benefits */}
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.68rem', mb: 1.5, display: 'block' }}>
                                    Maturity Benefits
                                  </Typography>
                                  {!maturityBenefits.length ? (
                                    <Typography variant='body2' color='text.secondary' sx={{ fontStyle: 'italic' }}>
                                      No benefit rules configured.
                                    </Typography>
                                  ) : (
                                    <Stack spacing={1}>
                                      {maturityBenefits.slice(0, 4).map(benefit => (
                                        <Box
                                          key={benefit.id}
                                          sx={{
                                            p: 2,
                                            borderRadius: 2.5,
                                            bgcolor: 'action.hover',
                                            border: '1px solid',
                                            borderColor: 'divider'
                                          }}
                                        >
                                          <Stack direction='row' justifyContent='space-between' alignItems='center'>
                                            <Typography fontWeight={600} sx={{ fontSize: '0.9rem' }}>
                                              {`Month ${benefit.month}`}
                                            </Typography>
                                            <Chip
                                              label={benefit.type === 'percentage' ? `${benefit.value}%` : currencyFormatter.format(Number(benefit.value || 0))}
                                              size='small'
                                              variant='outlined'
                                              sx={{ fontSize: '0.7rem', height: 22 }}
                                            />
                                          </Stack>
                                        </Box>
                                      ))}
                                    </Stack>
                                  )}
                                </Grid>
                              </Grid>

                              {/* Footer: Latest snapshot + link */}
                              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                                <Box>
                                  <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                                    Latest Payment
                                  </Typography>
                                  <Typography fontWeight={600} sx={{ fontSize: '0.9rem' }}>
                                    {latestPayment
                                      ? `${currencyFormatter.format(Number(latestPayment.amount || 0))} on ${new Date(latestPayment.payment_date).toLocaleDateString('en-IN')}`
                                      : 'No payment yet'}
                                  </Typography>
                                </Box>
                                <Button
                                  component={Link}
                                  href={`/membership/${membership.id}`}
                                  variant='outlined'
                                  size='small'
                                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                >
                                  View Details →
                                </Button>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </Stack>
              )}

              {/* ── Tab 1: Payment History ── */}
              {activeTab === 1 && (
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'center' }} spacing={2}>
                    <Typography variant='body2' color='text.secondary'>
                      Aggregated collections across all memberships
                    </Typography>
                    <Button
                      component={Link}
                      href={`/payments?customer_id=${customer.id}`}
                      variant='outlined'
                      size='small'
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    >
                      Open Full Ledger
                    </Button>
                  </Stack>

                  {!customerPayments.length ? (
                    <Alert severity='info' sx={{ borderRadius: 2 }}>
                      No payments recorded for this customer yet.
                    </Alert>
                  ) : (
                    <Stack spacing={1.5}>
                      {customerPayments.slice(0, 10).map((payment, index) => (
                        <Box
                          key={payment.id}
                          sx={{
                            p: 2.5,
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'action.hover',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: 'action.selected',
                              borderColor: alpha('#6366f1', 0.3)
                            }
                          }}
                        >
                          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
                            <Stack direction='row' spacing={2} alignItems='flex-start'>
                              {/* Status dot indicator */}
                              <Box
                                sx={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  mt: 0.8,
                                  flexShrink: 0,
                                  bgcolor:
                                    payment.status === 'completed' || payment.status === 'success'
                                      ? '#10b981'
                                      : payment.status === 'failed'
                                        ? '#ef4444'
                                        : '#f59e0b'
                                }}
                              />
                              <Box>
                                <Typography fontWeight={700}>
                                  {currencyFormatter.format(Number(payment.amount || 0))}
                                </Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  {`${new Date(payment.payment_date).toLocaleDateString('en-IN')} • ${payment.schemeName} (${payment.schemeCode})`}
                                </Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {`Installment #${payment.installment?.installment_no || '-'} • ${payment.gateway || 'Manual'} • ${payment.transaction_id || 'No ref'} • ${payment.status}`}
                                </Typography>
                              </Box>
                            </Stack>
                            <Stack direction='row' spacing={1} alignItems='center' flexShrink={0}>
                              <Button
                                component={Link}
                                href={`/membership/${payment.membershipId}`}
                                variant='outlined'
                                size='small'
                                sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.75rem' }}
                              >
                                Membership
                              </Button>
                              <Button
                                component={Link}
                                href={`/payments/receipt/${payment.receipt_id || payment.id}`}
                                variant='contained'
                                size='small'
                                sx={{
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  fontSize: '0.75rem',
                                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                  '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }
                                }}
                              >
                                Receipt
                              </Button>
                            </Stack>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      {/* Error alert at bottom if present */}
      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error' sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        </Grid>
      )}
    </Grid>

    {/* ──── Add Relative Request Dialog ──── */}
    <Dialog open={linkedProfileDialogOpen} onClose={() => !savingRelativeRequest && setLinkedProfileDialogOpen(false)} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add Relative Account</DialogTitle>
      <DialogContent>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          Search an existing customer and send them a request. Once they approve it in their portal, they appear in the
          relative accounts section.
        </Typography>
        {linkedProfileError && (
          <Alert severity='error' sx={{ mb: 3 }} onClose={() => setLinkedProfileError(null)}>
            {linkedProfileError}
          </Alert>
        )}
        <Stack spacing={2}>
          <TextField
            fullWidth
            size='small'
            autoFocus
            label='Search customer'
            placeholder='Search by name, mobile, or card number'
            value={relativeSearch}
            onChange={e => {
              const value = e.target.value
              setRelativeSearch(value)

              if (relativeSearchTimeout.current) clearTimeout(relativeSearchTimeout.current)

              if (value.trim().length < 2) {
                setRelativeResults([])
                return
              }

              relativeSearchTimeout.current = setTimeout(() => void searchRelativeCandidates(value), 350)
            }}
          />

          {relativeTargets.length > 0 && (
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                Selected relatives
              </Typography>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                {relativeTargets.map(target => (
                  <Chip
                    key={target.id}
                    label={target.name || target.mobile}
                    onDelete={() => toggleRelativeTarget(target)}
                    color='primary'
                    variant='outlined'
                    size='small'
                  />
                ))}
              </Stack>
            </Box>
          )}

          <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
            {relativeSearching ? (
              <Stack alignItems='center' sx={{ py: 3 }}>
                <CircularProgress size={24} />
              </Stack>
            ) : (
              <List disablePadding>
                {relativeResults.map(result => {
                  const selected = relativeTargets.some(item => item.id === result.id)

                  return (
                    <ListItemButton
                      key={result.id}
                      onClick={() => toggleRelativeTarget(result)}
                      selected={selected}
                      sx={{
                        borderRadius: 2,
                        mb: 1,
                        border: '1px solid',
                        borderColor: selected ? 'primary.main' : 'divider',
                        bgcolor: selected ? 'action.selected' : 'transparent'
                      }}
                    >
                      <ListItemText
                        primary={result.name || 'Unnamed customer'}
                        secondary={[
                          result.mobile,
                          result.loyalty_card_no ? `Card: ${result.loyalty_card_no}` : null
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      />
                      <Typography variant='caption' color={selected ? 'primary.main' : 'text.secondary'} fontWeight={700}>
                        {selected ? 'Selected' : 'Select'}
                      </Typography>
                    </ListItemButton>
                  )
                })}
                {relativeSearch.trim().length >= 2 && relativeResults.length === 0 && (
                  <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
                    No matching customers found.
                  </Typography>
                )}
              </List>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={() => setLinkedProfileDialogOpen(false)} variant='outlined' disabled={savingRelativeRequest}>
          Cancel
        </Button>
        <Button
          onClick={() => void handleAddRelativeRequest()}
          variant='contained'
          disabled={relativeTargets.length === 0 || savingRelativeRequest}
          startIcon={savingRelativeRequest ? <CircularProgress size={16} color='inherit' /> : undefined}
        >
          {savingRelativeRequest ? 'Sending...' : 'Send Request'}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  )
}

export default CustomerProfilePage
