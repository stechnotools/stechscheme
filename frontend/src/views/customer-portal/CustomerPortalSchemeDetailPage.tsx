'use client'

import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { customerPortalRequest } from '@/libs/customerPortal'
import { resolveSchemeImageUrl, type PortalScheme } from './CustomerPortalSchemesPage'

type JoinRequestStatus = {
  id: number
  scheme_id: number
  status: 'pending' | 'approved' | 'rejected'
}

type MaturityBenefit = {
  id: number
  month: number
  type: string
  value: string | number
}

type SchemeDetail = PortalScheme & {
  min_installment_value?: string | number | null
  max_installments?: number | null
  closing_penalty?: string | number | null
  late_fee_type?: string | null
  late_fee_value?: string | number | null
  allow_bonus?: boolean
  bonus_no_of_installments?: number | null
  lock_in_period_months?: number | null
  redemption_window_days?: number | null
  remarks?: string | null
  maturity_benefits?: MaturityBenefit[]
}

type SchemeDetailResponse = { data: SchemeDetail }

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Stack direction='row' justifyContent='space-between'>
    <Typography color='text.secondary'>{label}</Typography>
    <Typography fontWeight={700}>{value}</Typography>
  </Stack>
)

const CustomerPortalSchemeDetailPage = ({ schemeId }: { schemeId: number }) => {
  const [scheme, setScheme] = useState<SchemeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [existingRequest, setExistingRequest] = useState<JoinRequestStatus | null>(null)
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const loadJoinRequests = async () => {
    try {
      const response = await customerPortalRequest<{ data: JoinRequestStatus[] }>('/customer-portal/scheme-join-requests')
      setExistingRequest(response.data.find(item => item.scheme_id === schemeId) || null)
    } catch {
      // Non-fatal — the Join button will just remain available.
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const response = await customerPortalRequest<SchemeDetailResponse>(`/customer-portal/schemes/${schemeId}`)
        setScheme(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load scheme.')
      }
    }

    void load()
    void loadJoinRequests()
  }, [schemeId])

  const handleConfirmJoin = async () => {
    if (!termsAccepted) {
      setJoinError('Please accept the terms & conditions to continue.')
      return
    }

    setSubmitting(true)
    setJoinError(null)

    try {
      await customerPortalRequest('/customer-portal/scheme-join-requests', {
        method: 'POST',
        body: JSON.stringify({ scheme_id: schemeId, terms_accepted: true })
      })
      setJoinDialogOpen(false)
      void loadJoinRequests()
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to submit join request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!scheme) {
    return (
      <Box sx={{ p: 4 }}>
        {error ? <Alert severity='error'>{error}</Alert> : <Stack alignItems='center' sx={{ mt: 6 }}><CircularProgress /></Stack>}
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {scheme.banner_image_path ? (
            <CardMedia component='img' height='180' image={resolveSchemeImageUrl(scheme.banner_image_path)} alt={`${scheme.name} banner`} sx={{ objectFit: 'cover' }} />
          ) : null}
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
                <Typography variant='h6'>{scheme.name}</Typography>
                {scheme.scheme_type ? <Chip size='small' label={scheme.scheme_type} color='primary' /> : null}
              </Stack>
              {scheme.code ? <Typography variant='body2' color='text.secondary'>Code: {scheme.code}</Typography> : null}
              {scheme.description ? <Typography variant='body2'>{scheme.description}</Typography> : null}
            </Stack>
          </CardContent>
        </Card>

        {error ? <Alert severity='warning'>{error}</Alert> : null}

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Installment Plan
              </Typography>
              <InfoRow label='Installment Value' value={scheme.installment_value ? currencyFormatter.format(Number(scheme.installment_value)) : '-'} />
              {scheme.min_installment_value ? (
                <InfoRow label='Minimum Installment' value={currencyFormatter.format(Number(scheme.min_installment_value))} />
              ) : null}
              <InfoRow label='Total Installments' value={scheme.total_installments ? `${scheme.total_installments} months` : '-'} />
              {scheme.max_installments ? <InfoRow label='Maximum Installments' value={`${scheme.max_installments} months`} /> : null}
              <InfoRow label='Grace Days' value={`${scheme.grace_days ?? 0} days`} />
              {scheme.closing_penalty ? <InfoRow label='Closing Penalty' value={currencyFormatter.format(Number(scheme.closing_penalty))} /> : null}
              {scheme.late_fee_value ? (
                <InfoRow label='Late Fee' value={`${currencyFormatter.format(Number(scheme.late_fee_value))} (${scheme.late_fee_type || 'flat'})`} />
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Benefits
              </Typography>
              {scheme.benefit_type ? <InfoRow label='Benefit Type' value={scheme.benefit_type} /> : null}
              {scheme.benefit_mode ? <InfoRow label='Benefit Mode' value={scheme.benefit_mode} /> : null}
              {scheme.allow_bonus && scheme.bonus_no_of_installments ? (
                <InfoRow label='Bonus Installments' value={String(scheme.bonus_no_of_installments)} />
              ) : null}
              {scheme.lock_in_period_months ? <InfoRow label='Lock-in Period' value={`${scheme.lock_in_period_months} months`} /> : null}
              {scheme.redemption_window_days ? <InfoRow label='Redemption Window' value={`${scheme.redemption_window_days} days`} /> : null}

              {scheme.maturity_benefits && scheme.maturity_benefits.length > 0 ? (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant='body2' color='text.secondary'>Maturity Benefit Slabs</Typography>
                  {scheme.maturity_benefits.map(benefit => (
                    <Box key={benefit.id} sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                      <Typography fontWeight={700}>Month {benefit.month}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {benefit.type} • {benefit.type === 'percentage' ? `${benefit.value}%` : currencyFormatter.format(Number(benefit.value || 0))}
                      </Typography>
                    </Box>
                  ))}
                </>
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        {scheme.remarks ? (
          <Card>
            <CardContent>
              <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
                Notes
              </Typography>
              <Typography variant='body2'>{scheme.remarks}</Typography>
            </CardContent>
          </Card>
        ) : null}

        {existingRequest ? (
          <Alert severity={existingRequest.status === 'approved' ? 'success' : existingRequest.status === 'rejected' ? 'error' : 'info'}>
            {existingRequest.status === 'pending' && 'Your request to join this scheme is pending staff approval.'}
            {existingRequest.status === 'approved' && 'Your request was approved — check your Dashboard for the new membership.'}
            {existingRequest.status === 'rejected' && 'Your request to join this scheme was not approved. Please contact your branch for details.'}
          </Alert>
        ) : (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant='body2' color='text.secondary'>
                  Submitting a request does not enroll you immediately — our team reviews and confirms your KYC before activating the membership.
                </Typography>
                <Button variant='contained' onClick={() => setJoinDialogOpen(true)} sx={{ alignSelf: 'flex-start' }}>
                  Request to Join
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>

      <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Join {scheme.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {joinError ? <Alert severity='error'>{joinError}</Alert> : null}
            <Typography variant='body2' color='text.secondary'>
              By requesting to join, you agree to the installment schedule, grace period, and closing/late fee terms described above. Your
              membership will be activated by our team after this request is approved.
            </Typography>
            <FormControlLabel
              control={<Checkbox checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} />}
              label='I have read and accept the terms & conditions of this scheme.'
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={() => void handleConfirmJoin()} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CustomerPortalSchemeDetailPage
