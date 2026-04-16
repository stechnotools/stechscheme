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
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import { branchCurrencyFormatter, getBranchStatusColor, mapApiBranchToBranch, resolveBackendApiUrl, type ApiBranch, type Branch, type BranchStatus } from './data'

const BranchListPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const [branchItems, setBranchItems] = useState<Branch[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | BranchStatus>('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

      const payload = (await response.json().catch(() => null)) as { data?: ApiBranch[]; message?: string } | null

      if (!response.ok) {
        throw new Error(payload?.message || 'Request failed')
      }

      return payload as T
    },
    [accessToken]
  )

  const loadBranches = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      const response = await request<{ data: ApiBranch[] }>('/branches?per_page=200&sort_by=name&sort_direction=asc')
      setBranchItems(response.data.map(mapApiBranchToBranch))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, request])

  useEffect(() => {
    if (status === 'authenticated') {
      void loadBranches()
    }
  }, [status, loadBranches])

  const cityOptions = useMemo(() => {
    return ['all', ...Array.from(new Set(branchItems.map(branch => branch.city))).sort()]
  }, [branchItems])

  const filteredBranches = useMemo(() => {
    const query = search.trim().toLowerCase()

    return branchItems.filter(branch => {
      const matchesSearch =
        !query ||
        branch.name.toLowerCase().includes(query) ||
        branch.code.toLowerCase().includes(query) ||
        branch.city.toLowerCase().includes(query) ||
        branch.manager.toLowerCase().includes(query)

      const matchesStatus = statusFilter === 'all' || branch.status === statusFilter
      const matchesCity = cityFilter === 'all' || branch.city === cityFilter

      return matchesSearch && matchesStatus && matchesCity
    })
  }, [branchItems, cityFilter, search, statusFilter])

  const totals = useMemo(() => {
    const activeMembers = filteredBranches.reduce((sum, branch) => sum + branch.members, 0)
    const collections = filteredBranches.reduce((sum, branch) => sum + branch.monthlyCollections, 0)
    const dueToday = filteredBranches.reduce((sum, branch) => sum + branch.dueToday, 0)
    const performing = filteredBranches.filter(branch => branch.status === 'Performing').length

    return {
      branches: filteredBranches.length,
      activeMembers,
      collections,
      dueToday,
      performing
    }
  }, [filteredBranches])

  const topBranch = useMemo(() => {
    return [...filteredBranches].sort((left, right) => right.monthlyCollections - left.monthlyCollections)[0] ?? null
  }, [filteredBranches])

  const attentionBranches = useMemo(() => {
    return filteredBranches
      .filter(branch => branch.status !== 'Performing')
      .sort((left, right) => right.dueToday - left.dueToday)
      .slice(0, 3)
  }, [filteredBranches])

  const handleDelete = () => {
    if (!deleteTarget) return
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    try {
      await request(`/branches/${deleteTarget.id}`, {
        method: 'DELETE'
      })
      setSuccessMessage(`${deleteTarget.name} was deleted successfully.`)
      setDeleteTarget(null)
      await loadBranches()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete branch.')
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
            background:
              'radial-gradient(circle at top left, rgba(251,191,36,0.28), transparent 28%), linear-gradient(135deg, #0f172a 0%, #14532d 46%, #0f766e 100%)'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 7 } }}>
            <Box
              sx={{
                position: 'absolute',
                insetInlineEnd: { xs: -60, md: -30 },
                insetBlockStart: -70,
                width: 260,
                height: 260,
                borderRadius: '28px',
                transform: 'rotate(24deg)',
                background: 'rgba(255,255,255,0.08)'
              }}
            />

            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={4}
              justifyContent='space-between'
              alignItems={{ xs: 'flex-start', lg: 'flex-end' }}
              sx={{ position: 'relative', zIndex: 1 }}
            >
              <Stack spacing={2} sx={{ maxWidth: 760 }}>
                <Chip
                  label='Branch Network Overview'
                  sx={{
                    alignSelf: 'flex-start',
                    bgcolor: 'rgba(255,255,255,0.12)',
                    color: 'common.white',
                    '& .MuiChip-label': { fontWeight: 700 }
                  }}
                />
                <div>
                  <Typography variant='h3' sx={{ color: 'common.white', mb: 1.5 }}>
                    Keep every showroom aligned, visible, and ready for collections.
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 680 }}>
                    Review branch performance, spot collection pressure early, and give operations teams one clean
                    dashboard for day-to-day follow-up across cities.
                  </Typography>
                </div>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    component={Link}
                    href='/branches/add'
                    variant='contained'
                    startIcon={<i className='ri-add-line' />}
                    sx={{
                      bgcolor: 'common.white',
                      color: '#14532d',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.92)'
                      }
                    }}
                  >
                    Add Branch
                  </Button>
                  <Button
                    variant='outlined'
                    sx={{
                      color: 'common.white',
                      borderColor: 'rgba(255,255,255,0.28)',
                      '&:hover': {
                        borderColor: 'rgba(255,255,255,0.5)',
                        bgcolor: 'rgba(255,255,255,0.04)'
                      }
                    }}
                  >
                    Export Summary
                  </Button>
                </Stack>
              </Stack>

              <Card
                sx={{
                  minWidth: { xs: '100%', lg: 320 },
                  bgcolor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  color: 'common.white',
                  border: '1px solid rgba(255,255,255,0.12)'
                }}
              >
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography variant='overline' sx={{ color: 'rgba(255,255,255,0.72)', letterSpacing: 1 }}>
                      Network Collections
                    </Typography>
                    <Typography variant='h4' sx={{ color: 'common.white' }}>
                      {branchCurrencyFormatter.format(totals.collections)}
                    </Typography>
                    <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.78)' }}>
                      {totals.performing} performing branches are driving the current month strongly.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>
              Visible Branches
            </Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>
              {totals.branches}
            </Typography>
            <Typography variant='body2' color='success.main'>
              Live filtered count
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>
              Active Members
            </Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>
              {totals.activeMembers.toLocaleString('en-IN')}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Across the selected network
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>
              Collections This Month
            </Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>
              {branchCurrencyFormatter.format(totals.collections)}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Branch-level collection run rate
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>
              Due Follow-ups Today
            </Typography>
            <Typography variant='h4' sx={{ mt: 2, mb: 1 }}>
              {totals.dueToday}
            </Typography>
            <Typography variant='body2' color={totals.dueToday > 40 ? 'warning.main' : 'text.secondary'}>
              Customers needing collection reminders
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Stack spacing={3}>
              {error ? <Alert severity='error'>{error}</Alert> : null}
              {successMessage ? <Alert severity='success'>{successMessage}</Alert> : null}

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label='Search branches'
                  placeholder='Search by branch, code, city, or manager'
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <i className='ri-search-line' />
                      </InputAdornment>
                    )
                  }}
                />
                <TextField
                  select
                  fullWidth
                  label='Status'
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value as 'all' | BranchStatus)}
                >
                  <MenuItem value='all'>All statuses</MenuItem>
                  <MenuItem value='Performing'>Performing</MenuItem>
                  <MenuItem value='Needs Attention'>Needs Attention</MenuItem>
                  <MenuItem value='New Launch'>New Launch</MenuItem>
                </TextField>
                <TextField
                  select
                  fullWidth
                  label='City'
                  value={cityFilter}
                  onChange={event => setCityFilter(event.target.value)}
                >
                  {cityOptions.map(option => (
                    <MenuItem key={option} value={option}>
                      {option === 'all' ? 'All cities' : option}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              {loading ? (
                <Stack alignItems='center' justifyContent='center' sx={{ py: 10 }}>
                  <CircularProgress />
                </Stack>
              ) : !filteredBranches.length ? (
                <Alert severity='info'>No branches match the current filters.</Alert>
              ) : null}

              <Stack spacing={2.5}>
                {filteredBranches.map(branch => {
                  const collectionGoal = Math.min(100, Math.round((branch.monthlyCollections / 3000000) * 100))

                  return (
                    <Card
                      key={branch.id}
                      variant='outlined'
                      sx={{
                        borderColor: 'divider',
                        background:
                          'linear-gradient(135deg, rgba(15,23,42,0.015) 0%, rgba(20,83,45,0.04) 100%)'
                      }}
                    >
                      <CardContent>
                        <Stack spacing={2.5}>
                          <Stack
                            direction={{ xs: 'column', lg: 'row' }}
                            spacing={2}
                            justifyContent='space-between'
                            alignItems={{ xs: 'flex-start', lg: 'center' }}
                          >
                            <Stack spacing={1}>
                              <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
                                <Typography variant='h5'>{branch.name}</Typography>
                                <Chip label={branch.status} color={getBranchStatusColor(branch.status)} size='small' variant='tonal' />
                              </Stack>
                              <Typography variant='body2' color='text.secondary'>
                                {branch.code} • {branch.city} • Managed by {branch.manager}
                              </Typography>
                            </Stack>

                            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                              <Chip label={`${branch.activeSchemes} active schemes`} variant='outlined' size='small' />
                              <Chip
                                label={`${branch.growth > 0 ? '+' : ''}${branch.growth}% growth`}
                                color={branch.growth >= 0 ? 'success' : 'error'}
                                variant='tonal'
                                size='small'
                              />
                            </Stack>
                          </Stack>

                          <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant='body2' color='text.secondary'>
                                Active members
                              </Typography>
                              <Typography variant='h5' sx={{ mt: 1 }}>
                                {branch.members.toLocaleString('en-IN')}
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant='body2' color='text.secondary'>
                                Monthly collection
                              </Typography>
                              <Typography variant='h5' sx={{ mt: 1 }}>
                                {branchCurrencyFormatter.format(branch.monthlyCollections)}
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant='body2' color='text.secondary'>
                                Due follow-ups today
                              </Typography>
                              <Typography variant='h5' sx={{ mt: 1 }}>
                                {branch.dueToday}
                              </Typography>
                            </Grid>
                          </Grid>

                          <div>
                            <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                              <Typography variant='body2' color='text.secondary'>
                                Collection momentum
                              </Typography>
                              <Typography variant='body2' color='text.secondary'>
                                {collectionGoal}%
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant='determinate'
                              value={collectionGoal}
                              sx={{
                                height: 10,
                                borderRadius: 999,
                                bgcolor: 'action.hover',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 999,
                                  background: 'linear-gradient(90deg, #f59e0b 0%, #16a34a 100%)'
                                }
                              }}
                            />
                          </div>

                          <Stack direction='row' spacing={1} justifyContent='flex-end' flexWrap='wrap' useFlexGap>
                            <Button
                              component={Link}
                              href={`/branches/${branch.id}`}
                              variant='text'
                              startIcon={<i className='ri-eye-line' />}
                            >
                              View
                            </Button>
                            <Button
                              component={Link}
                              href={`/branches/${branch.id}/edit`}
                              variant='outlined'
                              startIcon={<i className='ri-edit-2-line' />}
                            >
                              Edit
                            </Button>
                            <IconButton color='error' onClick={() => setDeleteTarget(branch)}>
                              <i className='ri-delete-bin-6-line' />
                            </IconButton>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  )
                })}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Stack spacing={6}>
          <Card>
            <CardContent>
              <Stack spacing={2.5}>
                <div>
                  <Typography variant='h5'>Top Performing Branch</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Highest collection contribution in the current filtered set.
                  </Typography>
                </div>

                {topBranch ? (
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      color: 'common.white',
                      background: 'linear-gradient(135deg, #92400e 0%, #d97706 48%, #f59e0b 100%)'
                    }}
                  >
                    <Typography variant='h5' sx={{ color: 'common.white', mb: 0.5 }}>
                      {topBranch.name}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.82)', mb: 2 }}>
                      {topBranch.city} • {topBranch.manager}
                    </Typography>
                    <Typography variant='h4' sx={{ color: 'common.white' }}>
                      {branchCurrencyFormatter.format(topBranch.monthlyCollections)}
                    </Typography>
                  </Box>
                ) : (
                  <Alert severity='info'>No branch selected for this filter set.</Alert>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={2.5}>
                <div>
                  <Typography variant='h5'>Attention Queue</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Branches that need operational follow-up first.
                  </Typography>
                </div>

                {!attentionBranches.length ? (
                  <Alert severity='success'>No attention flags in the current filtered view.</Alert>
                ) : (
                  <Stack divider={<Divider flexItem />}>
                    {attentionBranches.map(branch => (
                      <Box key={branch.id} sx={{ py: 1.5 }}>
                        <Stack direction='row' justifyContent='space-between' spacing={2}>
                          <div>
                            <Typography fontWeight={700}>{branch.name}</Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {branch.city} • {branch.manager}
                            </Typography>
                          </div>
                          <Chip label={`${branch.dueToday} due`} color='warning' size='small' variant='tonal' />
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

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth='xs' fullWidth>
        <DialogContent sx={{ pt: 6, textAlign: 'center' }}>
          <Box sx={{ mb: 3, color: 'warning.main', fontSize: 72 }}>
            <i className='ri-error-warning-line' />
          </Box>
          <Typography variant='h4' sx={{ mb: 1.5 }}>
            Delete branch?
          </Typography>
          <Typography color='text.secondary'>
            {deleteTarget
              ? `${deleteTarget.name} will be removed from this list view. We can connect this to the backend delete endpoint next.`
              : ''}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 5, px: 4 }}>
          <Button variant='contained' color='error' onClick={() => void confirmDelete()}>
            Delete Branch
          </Button>
          <Button variant='outlined' color='secondary' onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default BranchListPage
