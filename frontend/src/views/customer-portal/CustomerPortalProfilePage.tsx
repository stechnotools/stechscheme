'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { clearCustomerPortalToken, customerPortalRequest } from '@/libs/customerPortal'
import { type RelativeAccount, type RelativeRequest } from '../customers/customerData'

type ProfileResponse = {
  data: {
    customer: {
      name?: string | null
      mobile: string
      email?: string | null
      created_at?: string | null
      loyalty_points_balance?: string | number | null
      lifetime_points?: string | number | null
      kyc?: { status?: string | null } | null
    }
    summary: {
      memberships_count: number
      active_memberships_count: number
      total_paid: number
    }
    relative_accounts?: RelativeAccount[]
    relative_requests?: RelativeRequest[]
  }
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const initialsOf = (name?: string | null, mobile?: string) => {
  if (name && name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('')
  }

  return mobile?.slice(-2) || '?'
}

const ListRow = ({
  href,
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  badge
}: {
  href: string
  icon: string
  iconBg: string
  iconColor: string
  title: string
  subtitle?: string
  badge?: string
}) => (
  <ListItemButton component={Link} href={href} sx={{ py: 1.5 }}>
    <ListItemIcon>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          bgcolor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <i className={icon} style={{ fontSize: '1.1rem', color: iconColor }} />
      </Box>
    </ListItemIcon>
    <ListItemText
      primary={title}
      secondary={subtitle}
      primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
      secondaryTypographyProps={{ fontSize: '0.75rem' }}
    />
    {badge && <Chip label={badge} size='small' sx={{ mr: 1, height: 20, fontSize: '0.65rem', bgcolor: '#FBF5E6', color: '#9A7828' }} />}
    <i className='ri-arrow-right-s-line' style={{ color: '#A08850' }} />
  </ListItemButton>
)

const CustomerPortalProfilePage = () => {
  const router = useRouter()
  const [payload, setPayload] = useState<ProfileResponse['data'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await customerPortalRequest<ProfileResponse>('/customer-portal/dashboard')
        setPayload(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile.')
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

  const refreshProfile = async () => {
    const response = await customerPortalRequest<ProfileResponse>('/customer-portal/dashboard')
    setPayload(response.data)
  }

  const handleRelativeRequestAction = async (requestId: number, action: 'approve' | 'reject') => {
    setProcessingRequestId(requestId)

    try {
      await customerPortalRequest(`/customer-portal/relative-requests/${requestId}/${action}`, {
        method: 'POST'
      })

      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update relative request.')
    } finally {
      setProcessingRequestId(null)
    }
  }

  if (!payload) {
    return (
      <Box sx={{ p: 4 }}>
        {error ? <Alert severity='error'>{error}</Alert> : <Stack alignItems='center' sx={{ mt: 6 }}><CircularProgress /></Stack>}
      </Box>
    )
  }

  const kycStatus = payload.customer.kyc?.status || 'pending'
  const memberSinceYear = payload.customer.created_at ? new Date(payload.customer.created_at).getFullYear() : null
  const points = Number(payload.customer.loyalty_points_balance || 0)
  const lifetimePoints = Number(payload.customer.lifetime_points || 0)
  const approvedRelatives = payload.relative_accounts || []
  const pendingRelativeRequests = (payload.relative_requests || []).filter(relative => relative.direction === 'incoming')
  // Honest substitute for a "tier progress" bar (no tier-threshold rule is configured
  // anywhere in this system) — shows how much of the customer's lifetime-earned
  // points are still sitting in their balance, unspent.
  const pointsRemainingPct = lifetimePoints > 0 ? Math.min(100, Math.round((points / lifetimePoints) * 100)) : 0

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={2.5}>
        {/* Hero */}
        <Box sx={{ position: 'relative', overflow: 'hidden', bgcolor: '#1A130A', borderRadius: 3, p: 3 }}>
          <Stack direction='row' spacing={2} alignItems='center'>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                bgcolor: 'rgba(201,168,76,0.18)',
                border: '2px solid #C9A84C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.25rem',
                color: '#E2C46A',
                flexShrink: 0
              }}
            >
              {initialsOf(payload.customer.name, payload.customer.mobile)}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant='h6' sx={{ color: '#fff', fontWeight: 700 }} noWrap>
                {payload.customer.name || 'Customer'}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem' }}>{payload.customer.mobile}</Typography>
              <Stack direction='row' spacing={1} sx={{ mt: 1 }} flexWrap='wrap' useFlexGap>
                {memberSinceYear && (
                  <Chip
                    size='small'
                    icon={<i className='ri-star-fill' style={{ fontSize: '0.7rem', color: '#E2C46A' }} />}
                    label={`Member since ${memberSinceYear}`}
                    sx={{ bgcolor: 'rgba(201,168,76,0.16)', color: '#E2C46A', height: 22, fontSize: '0.65rem' }}
                  />
                )}
                <Chip
                  size='small'
                  label={`KYC ${kycStatus}`}
                  sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', height: 22, fontSize: '0.65rem', textTransform: 'capitalize' }}
                />
              </Stack>
            </Box>
          </Stack>
        </Box>

        {error ? <Alert severity='warning'>{error}</Alert> : null}

        {/* Stat strip */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
          {[
            { v: payload.summary.memberships_count, l: 'Schemes' },
            { v: payload.summary.active_memberships_count, l: 'Active' },
            { v: points.toLocaleString('en-IN'), l: 'Points' }
          ].map(stat => (
            <Card key={stat.l} variant='outlined' sx={{ borderRadius: 2, textAlign: 'center', py: 1.5 }}>
              <Typography sx={{ fontSize: '1.15rem', fontWeight: 700 }}>{stat.v}</Typography>
              <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {stat.l}
              </Typography>
            </Card>
          ))}
        </Box>

        {/* Loyalty points */}
        <Card sx={{ borderRadius: 2 }}>
          <Box sx={{ p: 2.5 }}>
            <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Loyalty Points</Typography>
              <Typography sx={{ fontWeight: 700, color: '#9A7828' }}>{points.toLocaleString('en-IN')} pts</Typography>
            </Stack>
            {lifetimePoints > 0 ? (
              <>
                <LinearProgress
                  variant='determinate'
                  value={pointsRemainingPct}
                  sx={{ height: 7, borderRadius: 4, bgcolor: '#F5EDD4', '& .MuiLinearProgress-bar': { bgcolor: '#C9A84C', borderRadius: 4 } }}
                />
                <Typography variant='caption' color='text.secondary' sx={{ mt: 0.75, display: 'block' }}>
                  {pointsRemainingPct}% of your {lifetimePoints.toLocaleString('en-IN')} lifetime points are still available.
                </Typography>
              </>
            ) : (
              <Typography variant='caption' color='text.secondary'>No loyalty points earned yet.</Typography>
            )}
          </Box>
        </Card>

        {/* Schemes & Account */}
        <Box>
          <Typography variant='caption' sx={{ px: 0.5, color: 'text.secondary', fontWeight: 700, letterSpacing: '0.5px' }}>
            SCHEMES & ACCOUNT
          </Typography>
          <Card sx={{ mt: 1, borderRadius: 2 }}>
            <List disablePadding>
              <ListRow
                href='/customer/panel/schemes'
                icon='ri-store-2-line'
                iconBg='#FBF5E6'
                iconColor='#C9A84C'
                title='My Schemes'
                subtitle={`${payload.summary.active_memberships_count} active · ${currencyFormatter.format(payload.summary.total_paid)} invested`}
              />
              <Divider component='li' />
              <ListRow
                href='/customer/panel/kyc'
                icon='ri-shield-check-line'
                iconBg='#E1F7F2'
                iconColor='#0D9488'
                title='My KYC'
                subtitle={`Status: ${kycStatus}`}
              />
              <Divider component='li' />
              <ListRow
                href='/customer/panel/wallet'
                icon='ri-gift-line'
                iconBg='#FCE7ED'
                iconColor='#C2485A'
                title='Wallet & Rewards'
                subtitle={`${points.toLocaleString('en-IN')} pts available`}
              />
            </List>
          </Card>
        </Box>

        <Box>
          <Typography variant='caption' sx={{ px: 0.5, color: 'text.secondary', fontWeight: 700, letterSpacing: '0.5px' }}>
            RELATIVE ACCOUNTS
          </Typography>
          <Card sx={{ mt: 1, borderRadius: 2 }}>
            <List disablePadding>
              {pendingRelativeRequests.map(request => (
                <Box key={request.id} sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Stack spacing={1}>
                    <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
                      <Box>
                        <Typography variant='subtitle2' fontWeight={700}>
                          {request.customer?.name || 'Unnamed customer'}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {request.customer?.mobile}
                        </Typography>
                      </Box>
                      <Chip size='small' label='Awaiting approval' color='warning' />
                    </Stack>
                    <Stack direction='row' spacing={1}>
                      <Button
                        size='small'
                        variant='contained'
                        onClick={() => void handleRelativeRequestAction(request.id, 'approve')}
                        disabled={processingRequestId === request.id}
                      >
                        {processingRequestId === request.id ? 'Working...' : 'Approve'}
                      </Button>
                      <Button
                        size='small'
                        variant='outlined'
                        color='error'
                        onClick={() => void handleRelativeRequestAction(request.id, 'reject')}
                        disabled={processingRequestId === request.id}
                      >
                        Reject
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ))}

              {approvedRelatives.map(relative => (
                <ListRow
                  key={relative.request_id}
                  href={`/customer/panel`}
                  icon='ri-team-line'
                  iconBg='#F3F4F6'
                  iconColor='#6B7280'
                  title={relative.customer?.name || 'Unnamed customer'}
                  subtitle={[relative.customer?.mobile, relative.customer?.loyalty_card_no ? `Card: ${relative.customer.loyalty_card_no}` : null]
                    .filter(Boolean)
                    .join(' • ')}
                  badge='Approved'
                />
              ))}

              {!pendingRelativeRequests.length && !approvedRelatives.length && (
                <Box sx={{ p: 2 }}>
                  <Typography variant='body2' color='text.secondary'>
                    No relative accounts yet.
                  </Typography>
                </Box>
              )}
            </List>
          </Card>
        </Box>

        {/* Settings & Support */}
        <Box>
          <Typography variant='caption' sx={{ px: 0.5, color: 'text.secondary', fontWeight: 700, letterSpacing: '0.5px' }}>
            SETTINGS & SUPPORT
          </Typography>
          <Card sx={{ mt: 1, borderRadius: 2 }}>
            <List disablePadding>
              <ListRow href='/customer/panel/settings' icon='ri-notification-3-line' iconBg='#FBF5E6' iconColor='#9A7828' title='Notifications' subtitle='Manage alert preferences' />
              <Divider component='li' />
              <ListRow href='/customer/panel/appointments' icon='ri-calendar-event-line' iconBg='#FBF5E6' iconColor='#9A7828' title='Book Store Appointment' />
              <Divider component='li' />
              <ListRow href='/customer/panel/store-locator' icon='ri-map-pin-line' iconBg='#FBF5E6' iconColor='#9A7828' title='Store Locator' />
              <Divider component='li' />
              <ListRow href='/customer/panel/support' icon='ri-customer-service-2-line' iconBg='#FBF5E6' iconColor='#9A7828' title='Help & Support' />
            </List>
          </Card>
        </Box>

        <Card sx={{ borderRadius: 2 }}>
          <List disablePadding>
            <ListItemButton component={Link} href='/customer/login'>
              <ListItemIcon><i className='ri-user-add-line' style={{ fontSize: '1.3rem' }} /></ListItemIcon>
              <ListItemText primary='Switch Account' />
            </ListItemButton>
            <Divider component='li' />
            <ListItemButton onClick={() => void logout()}>
              <ListItemIcon><i className='ri-logout-box-r-line' style={{ fontSize: '1.3rem', color: '#dc2626' }} /></ListItemIcon>
              <ListItemText primary='Logout' primaryTypographyProps={{ color: 'error' }} />
            </ListItemButton>
          </List>
        </Card>
      </Stack>
    </Box>
  )
}

export default CustomerPortalProfilePage
