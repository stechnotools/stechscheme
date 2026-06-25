'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Fab from '@mui/material/Fab'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { customerPortalRequest, resolveBackendApiUrl } from '@/libs/customerPortal'

export type PortalScheme = {
  id: number
  name: string
  code?: string | null
  description?: string | null
  scheme_type?: string | null
  installment_value?: string | number | null
  total_installments?: number | null
  grace_days?: number | null
  benefit_type?: string | null
  benefit_mode?: string | null
  banner_image_path?: string | null
}

type SchemesResponse = { data: PortalScheme[] }

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const getBackendOrigin = () => resolveBackendApiUrl().replace(/\/api$/, '')

export const resolveSchemeImageUrl = (value?: string | null) => {
  if (!value) return ''
  if (/^(blob:|data:|https?:\/\/)/i.test(value)) return value

  return `${getBackendOrigin()}${value.startsWith('/') ? value : `/${value}`}`
}

const CustomerPortalSchemesPage = () => {
  const [schemes, setSchemes] = useState<PortalScheme[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const [selectedSchemeId, setSelectedSchemeId] = useState<number | ''>('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await customerPortalRequest<SchemesResponse>('/customer-portal/schemes')
        setSchemes(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schemes.')
      }
    }

    void load()
  }, [])

  const openJoinDialog = () => {
    setJoinError(null)
    setJoinSuccess(null)
    setTermsAccepted(false)
    setSelectedSchemeId(schemes?.[0]?.id ?? '')
    setJoinDialogOpen(true)
  }

  const handleJoinSubmit = async () => {
    if (!selectedSchemeId) {
      setJoinError('Please select a scheme.')
      return
    }
    if (!termsAccepted) {
      setJoinError('Please accept the terms & conditions to continue.')
      return
    }

    setSubmitting(true)
    setJoinError(null)

    try {
      const response = await customerPortalRequest<{ message: string }>('/customer-portal/scheme-join-requests', {
        method: 'POST',
        body: JSON.stringify({ scheme_id: selectedSchemeId, terms_accepted: true })
      })
      setJoinSuccess(response.message)
      setTermsAccepted(false)
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to submit join request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!schemes) {
    return (
      <Box sx={{ p: 4 }}>
        {error ? <Alert severity='error'>{error}</Alert> : <Stack alignItems='center' sx={{ mt: 6 }}><CircularProgress /></Stack>}
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        {error ? <Alert severity='warning'>{error}</Alert> : null}

        {schemes.length === 0 ? (
          <Alert severity='info'>No schemes are open for enrollment right now.</Alert>
        ) : (
          <Grid container spacing={3}>
            {schemes.map(scheme => (
              <Grid key={scheme.id} size={{ xs: 12, sm: 6 }}>
                <Card variant='outlined' sx={{ borderRadius: 2, height: '100%' }}>
                  <CardActionArea component={Link} href={`/customer/panel/schemes/${scheme.id}`} sx={{ height: '100%' }}>
                    {scheme.banner_image_path ? (
                      <CardMedia
                        component='img'
                        height='140'
                        image={resolveSchemeImageUrl(scheme.banner_image_path)}
                        alt={`${scheme.name} banner`}
                        sx={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <Box sx={{ height: 80, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className='ri-store-2-line' style={{ fontSize: '2rem', opacity: 0.4 }} />
                      </Box>
                    )}
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
                          <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>{scheme.name}</Typography>
                          {scheme.scheme_type ? <Chip size='small' label={scheme.scheme_type} color='primary' variant='outlined' /> : null}
                        </Stack>
                        {scheme.description ? (
                          <Typography variant='body2' color='text.secondary' sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {scheme.description}
                          </Typography>
                        ) : null}
                        <Stack direction='row' justifyContent='space-between'>
                          <Typography variant='caption' color='text.secondary'>Installment</Typography>
                          <Typography variant='body2' fontWeight={700}>
                            {scheme.installment_value ? currencyFormatter.format(Number(scheme.installment_value)) : '-'}
                          </Typography>
                        </Stack>
                        <Stack direction='row' justifyContent='space-between'>
                          <Typography variant='caption' color='text.secondary'>Duration</Typography>
                          <Typography variant='body2' fontWeight={700}>{scheme.total_installments ? `${scheme.total_installments} months` : '-'}</Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>

      {schemes.length > 0 && (
        <Fab
          color='primary'
          aria-label='Join a new scheme'
          onClick={openJoinDialog}
          sx={{
            position: 'fixed',
            right: 20,
            bottom: 'calc(64px + env(safe-area-inset-bottom) + 20px)',
            zIndex: theme => theme.zIndex.appBar
          }}
        >
          <i className='ri-add-line' style={{ fontSize: '1.6rem' }} />
        </Fab>
      )}

      <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Join a Scheme</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {joinError ? <Alert severity='error'>{joinError}</Alert> : null}
            {joinSuccess ? <Alert severity='success'>{joinSuccess}</Alert> : null}

            {!joinSuccess && (
              <>
                <FormControl fullWidth size='small'>
                  <InputLabel>Scheme</InputLabel>
                  <Select
                    label='Scheme'
                    value={selectedSchemeId}
                    onChange={event => setSelectedSchemeId(Number(event.target.value))}
                  >
                    {schemes.map(scheme => (
                      <MenuItem key={scheme.id} value={scheme.id}>
                        {scheme.name} {scheme.installment_value ? `· ${currencyFormatter.format(Number(scheme.installment_value))}/mo` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant='body2' color='text.secondary'>
                  Submitting a request does not enroll you immediately — our team reviews and confirms your KYC before
                  activating the membership.
                </Typography>

                <FormControlLabel
                  control={<Checkbox checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} />}
                  label='I have read and accept the terms & conditions of this scheme.'
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setJoinDialogOpen(false)}>{joinSuccess ? 'Close' : 'Cancel'}</Button>
          {!joinSuccess && (
            <Button variant='contained' onClick={() => void handleJoinSubmit()} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CustomerPortalSchemesPage
