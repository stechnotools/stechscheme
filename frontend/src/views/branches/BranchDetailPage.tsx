'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import { branchCurrencyFormatter, getBranchStatusColor, mapApiBranchToBranch, resolveBackendApiUrl, type ApiBranch } from './data'

const metricCards = (members: number, collections: number, dueToday: number) => [
  {
    label: 'Active Members',
    value: members.toLocaleString('en-IN'),
    subtitle: 'Customers currently enrolled'
  },
  {
    label: 'Monthly Collections',
    value: branchCurrencyFormatter.format(collections),
    subtitle: 'Current branch run rate'
  },
  {
    label: 'Due Follow-ups',
    value: String(dueToday),
    subtitle: 'Members to contact today'
  }
]

const BranchDetailPage = ({ branchId }: { branchId: number }) => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const [branch, setBranch] = useState<ReturnType<typeof mapApiBranchToBranch> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(
    async <T,>(path: string): Promise<T> => {
      if (!accessToken) {
        throw new Error('Missing access token')
      }

      const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })

      const payload = (await response.json().catch(() => null)) as { data?: ApiBranch; message?: string } | null

      if (!response.ok) {
        throw new Error(payload?.message || 'Request failed')
      }

      return payload as T
    },
    [accessToken]
  )

  useEffect(() => {
    if (status !== 'authenticated' || !accessToken) return

    const loadBranch = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await request<{ data: ApiBranch }>(`/branches/${branchId}`)
        setBranch(mapApiBranchToBranch(response.data))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load branch.')
      } finally {
        setLoading(false)
      }
    }

    void loadBranch()
  }, [status, accessToken, branchId, request])

  if (!branch) {
    return <Alert severity='error'>{error || 'Branch not found.'}</Alert>
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            overflow: 'hidden',
            position: 'relative',
            color: 'common.white',
            background: 'linear-gradient(135deg, #111827 0%, #166534 52%, #0f766e 100%)'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 6 } }}>
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={3}
              justifyContent='space-between'
              alignItems={{ xs: 'flex-start', lg: 'center' }}
            >
              <div>
                <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap sx={{ mb: 1.5 }}>
                  <Typography variant='h3' sx={{ color: 'common.white' }}>
                    {branch.name}
                  </Typography>
                  <Chip label={branch.status} color={getBranchStatusColor(branch.status)} variant='filled' size='small' />
                </Stack>
                <Typography sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 720 }}>
                  {branch.code} • {branch.city} • Managed by {branch.manager}
                </Typography>
              </div>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button component={Link} href='/branches' variant='outlined' sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.3)' }}>
                  Back to Branches
                </Button>
                <Button component={Link} href={`/branches/${branch.id}/edit`} variant='contained' sx={{ bgcolor: 'common.white', color: '#166534' }}>
                  Edit Branch
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {metricCards(branch.members, branch.monthlyCollections, branch.dueToday).map(metric => (
        <Grid key={metric.label} size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant='body2' color='text.secondary'>
                {metric.label}
              </Typography>
              <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>
                {metric.value}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {metric.subtitle}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}

      <Grid size={{ xs: 12, lg: 8 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <div>
                <Typography variant='h5'>Branch Snapshot</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Operational identity, contacts, and performance overview.
                </Typography>
              </div>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant='body2' color='text.secondary'>
                    Branch code
                  </Typography>
                  <Typography fontWeight={700}>{branch.code}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant='body2' color='text.secondary'>
                    City
                  </Typography>
                  <Typography fontWeight={700}>{branch.city}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant='body2' color='text.secondary'>
                    Branch manager
                  </Typography>
                  <Typography fontWeight={700}>{branch.manager}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant='body2' color='text.secondary'>
                    Growth
                  </Typography>
                  <Typography fontWeight={700}>{`${branch.growth > 0 ? '+' : ''}${branch.growth}%`}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant='body2' color='text.secondary'>
                    Phone
                  </Typography>
                  <Typography fontWeight={700}>{branch.phone}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant='body2' color='text.secondary'>
                    Email
                  </Typography>
                  <Typography fontWeight={700}>{branch.email}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant='body2' color='text.secondary'>
                    Address
                  </Typography>
                  <Typography fontWeight={700}>{branch.address}</Typography>
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Stack spacing={6}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant='h5'>Operating Defaults</Typography>
                <Chip label={branch.active ? 'Branch active' : 'Branch inactive'} color={branch.active ? 'success' : 'default'} variant='tonal' />
                <Chip
                  label={branch.walkInEnrollments ? 'Walk-ins enabled' : 'Walk-ins disabled'}
                  color={branch.walkInEnrollments ? 'info' : 'default'}
                  variant='tonal'
                />
                <Chip
                  label={branch.paymentReminders ? 'Reminders enabled' : 'Reminders disabled'}
                  color={branch.paymentReminders ? 'success' : 'default'}
                  variant='tonal'
                />
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant='h5'>Commercial Setup</Typography>
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    Collection zone
                  </Typography>
                  <Typography fontWeight={700} sx={{ textTransform: 'capitalize' }}>
                    {branch.zone} cluster
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    Default visibility
                  </Typography>
                  <Typography fontWeight={700}>
                    {branch.defaultSchemeVisibility === 'all' ? 'All schemes' : 'Selected schemes only'}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant='body2' color='text.secondary'>
                    Active schemes
                  </Typography>
                  <Typography fontWeight={700}>{branch.activeSchemes}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  )
}

export default BranchDetailPage
