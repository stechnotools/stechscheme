'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Grid container spacing={2} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
      <Typography variant="body2" color="text.secondary" fontWeight={500}>
        {label}
      </Typography>
    </Grid>
    <Grid size={{ xs: 12, sm: 8, md: 9 }}>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Typography variant="body1">{value || '-'}</Typography>
      ) : (
        value
      )}
    </Grid>
  </Grid>
)

const ViewSchemePage = () => {
  const router = useRouter()
  const params = useParams()
  const schemeId = params?.id

  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [scheme, setScheme] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(
    async <T,>(path: string): Promise<T> => {
      if (!accessToken) throw new Error('Missing access token')
      const response = await fetch(`${backendApiUrl}${path}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || 'Request failed')
      return payload as T
    },
    [accessToken]
  )

  useEffect(() => {
    if (status === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')
      setLoading(false)
      return
    }

    if (status === 'authenticated' && accessToken && schemeId) {
      const fetchScheme = async () => {
        try {
          const response = await request<{ data: any }>(`/schemes/${schemeId}`)
          setScheme(response.data)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load scheme details.')
        } finally {
          setLoading(false)
        }
      }
      void fetchScheme()
    }
  }, [status, accessToken, schemeId, request])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    )
  }

  if (error || !scheme) {
    return (
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Alert severity="error">{error || 'Scheme not found.'}</Alert>
          <Button component={Link} href='/schemes' sx={{ mt: 2 }} variant='outlined'>
            Back to Schemes
          </Button>
        </Grid>
      </Grid>
    )
  }

  const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between' alignItems='flex-start'>
          <div>
            <Typography variant='h4' sx={{ mb: 1 }}>
              {scheme.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={scheme.code} size="small" color="primary" variant="outlined" />
              <Chip label={scheme.scheme_type} size="small" color="secondary" variant="tonal" />
              {scheme.is_closed && <Chip label="Closed" size="small" color="error" />}
            </Stack>
          </div>
          <Stack direction="row" spacing={2}>
            <Button component={Link} href='/schemes' variant='outlined' color='secondary' startIcon={<i className='ri-arrow-left-line' />}>
              Back
            </Button>
            <Button component={Link} href={`/schemes/${scheme.id}/edit`} variant='contained' startIcon={<i className='ri-pencil-line' />}>
              Edit Scheme
            </Button>
          </Stack>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        <Stack spacing={4}>
          <Card>
            <CardHeader title="General Information" />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 3, pb: 2 }}>
                <InfoRow label="Scheme Name" value={scheme.name} />
                <InfoRow label="Scheme Code" value={scheme.code} />
                <InfoRow label="Scheme Type" value={scheme.scheme_type} />
                <InfoRow label="Item Group" value={scheme.item_group} />
                <InfoRow label="Start Date" value={scheme.start_date ? new Date(scheme.start_date).toLocaleDateString() : '-'} />
                <InfoRow label="Termination Date" value={scheme.termination_date ? new Date(scheme.termination_date).toLocaleDateString() : '-'} />
                <InfoRow label="Remarks" value={scheme.remarks} />
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Installment & Finances" />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 3, pb: 2 }}>
                <InfoRow label="Installment Type" value={scheme.no_of_installment_type} />
                <InfoRow label="Installment Value" value={currencyFormatter.format(Number(scheme.installment_value || 0))} />
                <InfoRow label="No of Installments" value={scheme.total_installments} />
                <InfoRow label="Duration" value={scheme.installment_duration} />
                <InfoRow label="Grace Days" value={`${scheme.grace_days} Days`} />
                <InfoRow 
                  label="Overdue Policy" 
                  value={
                    <Chip 
                      size="small" 
                      label={scheme.allow_overdue ? 'Allowed' : 'Not Allowed'} 
                      color={scheme.allow_overdue ? 'success' : 'error'} 
                      variant="outlined" 
                    />
                  } 
                />
                <InfoRow label="Late Fee Account" value={scheme.late_fee_effect_account} />
              </Box>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={4}>
          <Card>
            <CardHeader title="Bonus & Maturity" />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 3, pb: 2 }}>
                <InfoRow label="Allow Bonus" value={scheme.allow_bonus ? 'Yes' : 'No'} />
                {scheme.allow_bonus ? (
                  <>
                    <InfoRow label="Bonus Mode" value={scheme.benefit_type} />
                    <InfoRow label="Bonus Basis" value={scheme.benefit_mode} />
                    <InfoRow label="Apply Rate" value={scheme.apply_rate} />
                    <InfoRow label="Bonus Effect A/C" value={scheme.bonus_effect_account} />
                  </>
                ) : null}
                 <InfoRow label="Maturity Months After Last" value={scheme.maturity_months_after_last_installment} />
              </Box>
            </CardContent>
          </Card>

          {scheme.allow_bonus && scheme.benefit_type === 'Maturity Benefit' && (
            <Card>
              <CardHeader title="Maturity Benefits" />
              <Divider />
              <CardContent>
                {scheme.maturity_benefits && scheme.maturity_benefits.length > 0 ? (
                  <Stack spacing={2}>
                    {scheme.maturity_benefits.map((benefit: any, idx: number) => (
                      <Box key={idx} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.default' }}>
                        <Typography variant="subtitle2" gutterBottom>Month: {benefit.month}</Typography>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">Type: <strong style={{color: 'inherit'}}>{benefit.type}</strong></Typography>
                          <Typography variant="body2" color="text.secondary">Value: <strong>{benefit.value}</strong></Typography>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">No maturity benefits configured.</Typography>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader title="Additional Config" />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 3, pb: 2 }}>
                <InfoRow label="Change Rate Closing" value={scheme.allow_change_rate_closing ? 'Yes' : 'No'} />
                <InfoRow label="Wt. Booked With GST" value={scheme.wt_booked_with_gst ? 'Yes' : 'No'} />
              </Box>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  )
}

export default ViewSchemePage
