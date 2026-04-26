'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import LinearProgress from '@mui/material/LinearProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'

const MembershipSkeleton = () => (
  <Grid container spacing={6}>
    <Grid size={{ xs: 12 }}>
      <Skeleton variant='rectangular' height={240} sx={{ borderRadius: 2 }} />
    </Grid>
    <Grid container spacing={6} sx={{ mt: 0 }}>
      {[1, 2, 3, 4].map(i => (
        <Grid key={i} size={{ xs: 12, sm: 6, lg: 3 }}>
          <Skeleton variant='rectangular' height={110} sx={{ borderRadius: 2 }} />
        </Grid>
      ))}
    </Grid>
    <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 5 }}>
            <Skeleton variant='rectangular' height={56} sx={{ borderRadius: 1 }} />
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <TableCell key={i}><Skeleton variant='text' width='80%' height={30} /></TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {[1, 2, 3, 4, 5].map(row => (
                  <TableRow key={row}>
                    {[1, 2, 3, 4, 5, 6].map(col => (
                      <TableCell key={col}>
                        <Skeleton variant='text' width='90%' height={24} />
                        {col === 1 && <Skeleton variant='text' width='40%' height={20} />}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
)

type MembershipItem = {
  id: number
  status: string
  start_date: string
  maturity_date: string
  total_paid: string | number
  customer?: { id: number; name?: string | null; mobile: string } | null
  scheme?: { id: number; name: string; code: string; installment_value?: string | number; total_installments?: number | null } | null
  installments?: Array<{ id: number; paid: boolean }>
  payments?: Array<{ id: number }>
}

type MembershipsResponse = { data: MembershipItem[] }

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const getStatusColor = (status: string) => {
  const s = status.toLowerCase()
  if (s === 'active') return 'success'
  if (s === 'matured') return 'warning'
  if (s === 'redeemed') return 'info'
  if (s === 'closed') return 'error'
  return 'default'
}

const MembershipListPage = ({
  statusGroup,
  title
}: {
  statusGroup: 'active' | 'matured' | 'redeemed' | 'closed'
  title: string
}) => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  
  const [memberships, setMemberships] = useState<MembershipItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(
    async <T,>(path: string) => {
      if (!accessToken) throw new Error('Missing access token')
      const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` }
      })
      const payload = (await response.json().catch(() => null)) as any
      if (!response.ok) throw new Error(payload?.message || 'Request failed')
      return payload as T
    },
    [accessToken]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await request<MembershipsResponse>(`/memberships?per_page=500&status_group=${statusGroup}`)
      setMemberships(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memberships.')
    } finally {
      setLoading(false)
    }
  }, [request, statusGroup])

  useEffect(() => {
    if (accessToken) void load()
  }, [accessToken, load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return memberships.filter(
      item =>
        !q ||
        (item.customer?.name || '').toLowerCase().includes(q) ||
        (item.customer?.mobile || '').toLowerCase().includes(q) ||
        (item.scheme?.name || '').toLowerCase().includes(q) ||
        (item.scheme?.code || '').toLowerCase().includes(q) ||
        String(item.id).includes(q)
    )
  }, [memberships, search])

  const metrics = useMemo(() => {
    const totalCount = memberships.length
    const totalInvestment = memberships.reduce((sum, item) => sum + Number(item.total_paid || 0), 0)
    const maturedCount = memberships.filter(item => item.status === 'matured').length
    const activeCount = memberships.filter(item => item.status === 'active').length
    
    return { totalCount, totalInvestment, maturedCount, activeCount }
  }, [memberships])

  if (loading && memberships.length === 0) {
    return <MembershipSkeleton />
  }

  return (
    <Grid container spacing={6}>
      {/* Hero Header */}
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #1e40af 100%)',
            color: 'common.white'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 7 } }}>
            <Box
              sx={{
                position: 'absolute',
                insetInlineEnd: -30,
                insetBlockStart: -30,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)'
              }}
            />
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={4}
              justifyContent='space-between'
              alignItems={{ xs: 'flex-start', lg: 'center' }}
              sx={{ position: 'relative', zIndex: 1 }}
            >
              <Stack spacing={2} sx={{ maxWidth: 700 }}>
                <Chip
                  label='Membership Master'
                  sx={{
                    alignSelf: 'flex-start',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    color: 'common.white',
                    fontWeight: 700
                  }}
                />
                <Typography variant='h3' sx={{ color: 'common.white', mb: 1 }}>
                  {title}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.85)', maxWidth: 640 }}>
                  Manage customer scheme subscriptions, monitor installment progress, and track total investments across your branch network.
                </Typography>
                <Stack direction='row' spacing={3} sx={{ mt: 2 }} flexWrap='wrap' useFlexGap>
                  <Button
                    component={Link}
                    href='/subscriptions/create'
                    variant='contained'
                    sx={{
                      bgcolor: 'common.white',
                      color: '#1e40af',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' }
                    }}
                    startIcon={<i className='ri-user-add-line' />}
                  >
                    New Enrollment
                  </Button>
                </Stack>
              </Stack>

              <Card
                sx={{
                  minWidth: { xs: '100%', lg: 300 },
                  bgcolor: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(10px)',
                  color: 'common.white',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                <CardContent>
                  <Typography variant='overline' sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: 1.2 }}>
                    Live Subscription Count
                  </Typography>
                  <Typography variant='h4' sx={{ color: 'common.white', mt: 1.5 }}>
                    {memberships.length}
                  </Typography>
                  <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                    Total {statusGroup} records in system.
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Metrics Row */}
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>Total Active</Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>{metrics.activeCount}</Typography>
            <Typography variant='body2' color='success.main'>Current Enrollments</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>Total Matured</Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>{metrics.maturedCount}</Typography>
            <Typography variant='body2' color='warning.main'>Pending Redemption</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>Total Investment</Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>{currencyFormatter.format(metrics.totalInvestment)}</Typography>
            <Typography variant='body2' color='text.secondary'>Collected Capital</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>Avg. Collection</Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>
              {currencyFormatter.format(metrics.totalCount > 0 ? metrics.totalInvestment / metrics.totalCount : 0)}
            </Typography>
            <Typography variant='body2' color='text.secondary'>Per Subscription</Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {error && <Alert severity='error' sx={{ mb: 6 }}>{error}</Alert>}

        <Stack spacing={6}>
          {/* Search Bar */}
          <Card>
            <CardContent sx={{ py: 3 }}>
              <TextField
                fullWidth
                placeholder='Search by customer name, mobile, scheme code or ID...'
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <i className='ri-search-2-line' />
                    </InputAdornment>
                  )
                }}
              />
            </CardContent>
          </Card>

          {/* Subscriptions Data Table */}
          <Card>
            <TableContainer component={Paper} elevation={0}>
              <Table sx={{ minWidth: 1000 }} aria-label='subscriptions table'>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ pl: 4 }}>ID / Customer</TableCell>
                    <TableCell>Scheme Plan</TableCell>
                    <TableCell>Start / Maturity</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell align='right'>Paid Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align='right' sx={{ pr: 4 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(item => {
                    const paidInstallments = item.installments?.filter(i => i.paid).length || 0
                    const totalInstallments = item.installments?.length || item.scheme?.total_installments || 0
                    const progress = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0

                    return (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ pl: 4 }}>
                          <Stack direction='row' spacing={3} alignItems='center'>
                            <Typography variant='body2' fontWeight={700} sx={{ color: 'text.disabled', minWidth: 40 }}>
                              #{item.id}
                            </Typography>
                            <Box>
                              <Typography variant='body1' fontWeight={600}>{item.customer?.name || 'Unknown'}</Typography>
                              <Typography variant='caption' color='text.secondary'>{item.customer?.mobile}</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' fontWeight={600} color='primary'>{item.scheme?.name || 'N/A'}</Typography>
                          <Typography variant='caption' color='text.secondary'>{item.scheme?.code || 'No code'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{new Date(item.start_date).toLocaleDateString('en-IN')}</Typography>
                          <Typography variant='caption' color='text.secondary'>to {new Date(item.maturity_date).toLocaleDateString('en-IN')}</Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                          <Stack spacing={1}>
                            <Stack direction='row' justifyContent='space-between'>
                              <Typography variant='caption' fontWeight={600}>{paidInstallments} / {totalInstallments} Months</Typography>
                              <Typography variant='caption' color='text.secondary'>{Math.round(progress)}%</Typography>
                            </Stack>
                            <LinearProgress 
                              variant='determinate' 
                              value={progress} 
                              sx={{ height: 6, borderRadius: 3, bgcolor: 'action.selected' }} 
                              color={progress === 100 ? 'success' : 'primary'}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' fontWeight={700}>
                            {currencyFormatter.format(Number(item.total_paid || 0))}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            of {currencyFormatter.format(Number(item.scheme?.installment_value || 0) * (totalInstallments || 1))}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={item.status} 
                            size='small' 
                            color={getStatusColor(item.status)} 
                            variant='tonal' 
                            sx={{ fontWeight: 600, textTransform: 'capitalize', px: 1 }} 
                          />
                        </TableCell>
                        <TableCell align='right' sx={{ pr: 4 }}>
                          <Button 
                            component={Link} 
                            href={`/subscriptions/${item.id}`}
                            variant='outlined'
                            size='small'
                            startIcon={<i className='ri-eye-line' />}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align='center' sx={{ py: 15 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <i className='ri-subscription-line' style={{ fontSize: 48, color: 'var(--mui-palette-text-disabled)' }} />
                          <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>No subscriptions found.</Typography>
                          <Typography variant='body2' color='text.disabled'>Try a different search term or check another status group.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  )
}

export default MembershipListPage
