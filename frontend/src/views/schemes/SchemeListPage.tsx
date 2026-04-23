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
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import IconButton from '@mui/material/IconButton'

import { usePageLoading } from '@/contexts/pageLoadingContext'
import { SkeletonCard } from '@/components/SkeletonLoader'

type Scheme = {
  id: number
  name: string
  code: string
  scheme_type: string
  installment_value: string
  total_installments: number
  grace_days?: number | null
  allow_overdue: boolean
  memberships?: Array<unknown>
}

type SchemesResponse = {
  data: Scheme[]
}

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const SchemeListPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [schemeType, setSchemeType] = useState('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [schemeToDelete, setSchemeToDelete] = useState<Scheme | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { startLoading, stopLoading } = usePageLoading()

  const request = useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      if (!accessToken) {
        throw new Error('Missing access token')
      }

      const response = await fetch(`${backendApiUrl}${path}`, {
        ...options,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...options?.headers
        }
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(payload?.message || 'Request failed')
      }

      return payload as T
    },
    [accessToken]
  )

  const loadSchemes = useCallback(async () => {
    if (!accessToken) return

    startLoading()
    setLoading(true)
    setError(null)

    try {
      const response = await request<SchemesResponse>('/schemes?per_page=100&sort_by=created_at&sort_direction=desc')
      setSchemes(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schemes.')
    } finally {
      setLoading(false)
      stopLoading()
    }
  }, [accessToken, request, startLoading, stopLoading])

  useEffect(() => {
    if (status === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')
      return
    }

    if (status === 'authenticated') {
      void loadSchemes()
    }
  }, [status, accessToken, loadSchemes])

  const handleDeleteClick = (scheme: Scheme) => {
    setSchemeToDelete(scheme)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!schemeToDelete || !accessToken) return

    setIsDeleting(true)
    try {
      await request(`/schemes/${schemeToDelete.id}`, { method: 'DELETE' })
      setSchemes(prev => prev.filter(s => s.id !== schemeToDelete.id))
      setDeleteDialogOpen(false)
      setSchemeToDelete(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete scheme.')
    } finally {
      setIsDeleting(false)
    }
  }

  const schemeTypes = useMemo(() => {
    return Array.from(new Set(schemes.map(item => item.scheme_type).filter(Boolean))).sort()
  }, [schemes])

  const filteredSchemes = useMemo(() => {
    const query = search.trim().toLowerCase()

    return schemes.filter(item => {
      const matchesType = schemeType === 'all' || item.scheme_type === schemeType
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.scheme_type.toLowerCase().includes(query)

      return matchesType && matchesSearch
    })
  }, [schemeType, schemes, search])

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(135deg, rgba(133,77,14,1) 0%, rgba(217,119,6,1) 50%, rgba(251,191,36,1) 100%)',
            color: 'common.white'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 7 } }}>
            <Box
              sx={{
                position: 'absolute',
                insetInlineEnd: -40,
                insetBlockStart: -60,
                width: 220,
                height: 220,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)'
              }}
            />
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={3}
              justifyContent='space-between'
              alignItems={{ xs: 'flex-start', md: 'center' }}
              sx={{ position: 'relative', zIndex: 1 }}
            >
              <div>
                <Typography variant='h4' sx={{ color: 'common.white', mb: 1.5 }}>
                  All Schemes
                </Typography>
                <Typography sx={{ maxWidth: 760, color: 'rgba(255,255,255,0.86)' }}>
                  Track every jewellery savings plan in one place, review installment rules, and keep the membership
                  team aligned on what is currently active.
                </Typography>
              </div>
              <Button
                component={Link}
                href='/schemes/create'
                variant='contained'
                startIcon={<i className='ri-add-line' />}
                sx={{
                  bgcolor: 'common.white',
                  color: '#9a6700',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.92)'
                  }
                }}
              >
                Create Scheme
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {error ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error'>{error}</Alert>
        </Grid>
      ) : null}

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <TextField
                fullWidth
                label='Search schemes'
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder='Search by name, code, or type'
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
                label='Scheme type'
                value={schemeType}
                onChange={event => setSchemeType(event.target.value)}
              >
                <MenuItem value='all'>All types</MenuItem>
                {schemeTypes.map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant='outlined' color='secondary' onClick={() => void loadSchemes()} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='space-between'>
                <div>
                  <Typography variant='h5'>Scheme Catalogue</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {`${filteredSchemes.length} scheme${filteredSchemes.length === 1 ? '' : 's'} visible`}
                  </Typography>
                </div>
                <Chip
                  label={loading ? 'Syncing with backend' : 'Live backend data'}
                  color={loading ? 'warning' : 'success'}
                  variant='tonal'
                />
              </Stack>

              {loading ? (
                <SkeletonCard count={6} />
              ) : (
                <Grid container spacing={3}>
                {filteredSchemes.map(scheme => (
                  <Grid key={scheme.id} size={{ xs: 12, md: 6, xl: 4 }}>
                    <Card
                      variant='outlined'
                      sx={{
                        height: '100%',
                        borderColor: 'divider',
                        background: 'linear-gradient(180deg, rgba(245,158,11,0.06) 0%, rgba(255,255,255,0) 100%)'
                      }}
                    >
                      <CardContent>
                        <Stack spacing={2.5}>
                          <Stack direction='row' justifyContent='space-between' spacing={2} alignItems='flex-start'>
                            <div>
                              <Typography variant='h6'>{scheme.name}</Typography>
                              <Typography variant='body2' color='text.secondary'>
                                {`${scheme.code} • ${scheme.scheme_type}`}
                              </Typography>
                            </div>
                            <Stack direction='row' spacing={0.5} alignItems='center'>
                              <Chip
                                size='small'
                                label={scheme.allow_overdue ? 'Flexible' : 'Strict'}
                                color={scheme.allow_overdue ? 'warning' : 'success'}
                                variant='tonal'
                                sx={{ mr: 1 }}
                              />
                              <IconButton size='small' component={Link} href={`/schemes/${scheme.id}/view`} color='info'>
                                <i className='ri-eye-line' />
                              </IconButton>
                              <IconButton size='small' component={Link} href={`/schemes/${scheme.id}/edit`} color='primary'>
                                <i className='ri-pencil-line' />
                              </IconButton>
                              <IconButton size='small' color='error' onClick={() => handleDeleteClick(scheme)}>
                                <i className='ri-delete-bin-line' />
                              </IconButton>
                            </Stack>
                          </Stack>

                          <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant='body2' color='text.secondary'>
                                Installment
                              </Typography>
                              <Typography fontWeight={700}>
                                {currencyFormatter.format(Number(scheme.installment_value || 0))}
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant='body2' color='text.secondary'>
                                Duration
                              </Typography>
                              <Typography fontWeight={700}>{`${scheme.total_installments} months`}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant='body2' color='text.secondary'>
                                Grace
                              </Typography>
                              <Typography fontWeight={700}>{`${scheme.grace_days ?? 0} days`}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant='body2' color='text.secondary'>
                                Memberships
                              </Typography>
                              <Typography fontWeight={700}>{scheme.memberships?.length || 0}</Typography>
                            </Grid>
                          </Grid>

                          <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
                            <Chip
                              size='small'
                              label={scheme.allow_overdue ? 'Overdue allowed' : 'Strict due dates'}
                              color={scheme.allow_overdue ? 'warning' : 'success'}
                              variant='outlined'
                            />
                            <Chip
                              size='small'
                              label={`${scheme.memberships?.length || 0} active links`}
                              variant='outlined'
                            />
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}

                {!filteredSchemes.length ? (
                  <Grid size={{ xs: 12 }}>
                    <Alert severity='info'>
                      No schemes found for the current filters.
                    </Alert>
                  </Grid>
                ) : null}
              </Grid>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={deleteDialogOpen} onClose={() => !isDeleting && setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the scheme "{schemeToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button onClick={() => void handleDeleteConfirm()} color='error' variant='contained' disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default SchemeListPage
