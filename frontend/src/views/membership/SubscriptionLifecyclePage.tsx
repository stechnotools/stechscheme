'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

type MembershipItem = {
  id: number
  membership_no?: string | null
  status: string
  customer?: { id: number; name?: string | null; mobile?: string | null } | null
  scheme?: { id: number; name?: string | null; code?: string | null } | null
}

type LifecycleResponse = {
  membership: {
    id: number
    membership_no?: string | null
    status: string
    next_status: string
    customer?: { id?: number; name?: string | null; mobile?: string | null }
    scheme?: { id?: number; name?: string | null; code?: string | null }
  }
  summary: {
    action: string
    current_status: string
    next_status: string
    total_installments: number
    paid_installments: number
    pending_installments: number
    overdue_installments: number
    principal_total: number
    penalty_total: number
    paid_total: number
    principal_paid: number
    penalty_paid: number
    principal_outstanding: number
    penalty_outstanding: number
    bonus_amount: number
    closing_penalty_amount: number
    net_settlement_amount: number
    customer_payable_amount: number
    customer_receivable_amount: number
    maturity_due: boolean
    is_eligible_for_maturity: boolean
  }
  installments: Array<{
    id: number
    installment_no: number
    due_date: string | null
    amount: number
    penalty: number
    paid_amount: number
    balance_amount: number
    paid: boolean
    status: string
    overdue: boolean
  }>
}

const ACTIONS = [
  { value: 'mature', label: 'Maturity', description: 'Move an eligible subscription to matured status.' },
  { value: 'redeem', label: 'Redemption', description: 'Redeem the scheme and move it to redeemed status.' },
  { value: 'close', label: 'Closure', description: 'Close the subscription with any closing penalty applied.' },
  { value: 'cancel', label: 'Cancellation', description: 'Cancel the subscription and calculate penalty exposure.' },
  { value: 'settle', label: 'Settlement', description: 'Preview or finalize a custom settlement status.' },
]

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
})

const getStatusColor = (status: string) => {
  const s = status.toLowerCase()
  if (s === 'active') return 'success'
  if (s === 'matured') return 'warning'
  if (s === 'redeemed') return 'info'
  if (s === 'closed') return 'error'
  if (s === 'cancelled') return 'default'
  if (s === 'settled') return 'secondary'
  return 'default'
}

const SubscriptionLifecyclePage = () => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [memberships, setMemberships] = useState<MembershipItem[]>([])
  const [selectedMembershipId, setSelectedMembershipId] = useState<number | null>(null)
  const [selectedAction, setSelectedAction] = useState('mature')
  const [loading, setLoading] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [preview, setPreview] = useState<LifecycleResponse | null>(null)

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit) => {
      if (!accessToken) throw new Error('Missing access token')
      const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(init?.headers || {})
        }
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || 'Request failed')
      return payload as T
    },
    [accessToken]
  )

  const loadMemberships = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await request<{ data: MembershipItem[] }>(`/memberships?per_page=200&sort_by=id&sort_direction=desc`)
      setMemberships(response.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memberships.')
    } finally {
      setLoading(false)
    }
  }, [request])

  const loadPreview = useCallback(
    async (membershipId: number, action: string) => {
      setPreviewLoading(true)
      setError(null)
      try {
        const response = await request<{ data: LifecycleResponse }>(`/memberships/${membershipId}/lifecycle?action=${encodeURIComponent(action)}`)
        setPreview(response.data)
      } catch (err) {
        setPreview(null)
        setError(err instanceof Error ? err.message : 'Failed to load lifecycle preview.')
      } finally {
        setPreviewLoading(false)
      }
    },
    [request]
  )

  useEffect(() => {
    if (!accessToken) return
    void loadMemberships()
  }, [accessToken, loadMemberships])

  useEffect(() => {
    if (!selectedMembershipId && memberships.length > 0) {
      setSelectedMembershipId(memberships[0].id)
    }
  }, [memberships, selectedMembershipId])

  useEffect(() => {
    if (selectedMembershipId) {
      void loadPreview(selectedMembershipId, selectedAction)
    }
  }, [loadPreview, selectedAction, selectedMembershipId])

  const selectedMembership = useMemo(
    () => memberships.find(item => item.id === selectedMembershipId) || null,
    [memberships, selectedMembershipId]
  )

  const handleApply = async () => {
    if (!selectedMembershipId) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const response = await request<{ message?: string; data: LifecycleResponse }>(`/memberships/${selectedMembershipId}/lifecycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedAction,
          notes
        })
      })

      setPreview(response.data)
      setMessage(response.message || 'Lifecycle action completed successfully.')
      setNotes('')
      await loadMemberships()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete lifecycle action.')
    } finally {
      setSaving(false)
    }
  }

  if (loading && memberships.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant='h6'>Loading subscription lifecycle...</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #0f766e 100%)',
            color: 'common.white'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 7 } }}>
            <Stack spacing={2} sx={{ maxWidth: 800 }}>
              <Chip
                label='Scheme Lifecycle Module'
                sx={{ alignSelf: 'flex-start', bgcolor: 'rgba(255,255,255,0.16)', color: 'common.white', fontWeight: 700 }}
              />
              <Typography variant='h3' sx={{ color: 'common.white' }}>
                Maturity, Redemption, Closure, Cancellation, Bonus, Penalty, and Settlement
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)' }}>
                Preview the settlement impact, then finalize the lifecycle state for any subscription from one place.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error'>{error}</Alert>
        </Grid>
      )}

      {message && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='success'>{message}</Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12, lg: 4 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 3 }}>
              Select Subscription
            </Typography>
            <Autocomplete
              options={memberships}
              value={selectedMembership}
              onChange={(_, newValue) => setSelectedMembershipId(newValue?.id ?? null)}
              getOptionLabel={option => `${option.membership_no || `#${option.id}`} - ${option.customer?.name || 'Unknown'} - ${option.scheme?.name || 'Scheme'}`}
              renderInput={params => (
                <TextField
                  {...params}
                  label='Subscription'
                  placeholder='Search by customer or scheme'
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position='start'>
                          <i className='ri-search-2-line' />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    )
                  }}
                />
              )}
            />

            <TextField
              select
              fullWidth
              sx={{ mt: 4 }}
              label='Lifecycle Action'
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
            >
              {ACTIONS.map(action => (
                <MenuItem key={action.value} value={action.value}>
                  {action.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              multiline
              minRows={3}
              sx={{ mt: 4 }}
              label='Notes'
              placeholder='Optional internal notes'
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />

            <Stack direction='row' spacing={2} sx={{ mt: 4 }} flexWrap='wrap' useFlexGap>
              <Button variant='outlined' onClick={() => selectedMembershipId && loadPreview(selectedMembershipId, selectedAction)} disabled={previewLoading || !selectedMembershipId}>
                Preview
              </Button>
              <Button variant='contained' onClick={handleApply} disabled={saving || !selectedMembershipId}>
                {saving ? 'Saving...' : 'Apply Action'}
              </Button>
            </Stack>

            <Divider sx={{ my: 4 }} />

            <Stack spacing={2}>
              {ACTIONS.map(action => (
                <Box key={action.value}>
                  <Typography variant='subtitle2' fontWeight={700}>
                    {action.label}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {action.description}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Stack spacing={4}>
          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between'>
                <Box>
                  <Typography variant='overline' color='text.secondary'>
                    Selected Subscription
                  </Typography>
                  <Typography variant='h5'>
                    {selectedMembership?.membership_no || `#${selectedMembership?.id || '-'}`}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {selectedMembership?.customer?.name || 'Unknown customer'} {selectedMembership?.scheme?.name ? `· ${selectedMembership.scheme.name}` : ''}
                  </Typography>
                </Box>
                <Chip label={preview?.membership?.next_status || selectedMembership?.status || 'active'} color={getStatusColor(preview?.membership?.next_status || selectedMembership?.status || 'active')} />
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={4}>
            {[
              { label: 'Principal Outstanding', value: preview?.summary.principal_outstanding ?? 0 },
              { label: 'Penalty Outstanding', value: preview?.summary.penalty_outstanding ?? 0 },
              { label: 'Bonus Amount', value: preview?.summary.bonus_amount ?? 0 },
              { label: 'Net Settlement', value: preview?.summary.net_settlement_amount ?? 0 }
            ].map(card => (
              <Grid key={card.label} size={{ xs: 12, sm: 6, xl: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant='body2' color='text.secondary'>
                      {card.label}
                    </Typography>
                    <Typography variant='h5' sx={{ mt: 2 }}>
                      {money.format(card.value)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between'>
                <Box>
                  <Typography variant='h6'>Lifecycle Summary</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {previewLoading ? 'Refreshing preview...' : 'Calculated from current installment balances and scheme settings.'}
                  </Typography>
                </Box>
                <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                  <Chip label={`Action: ${preview?.summary.action || selectedAction}`} variant='outlined' />
                  <Chip label={`Eligible: ${preview?.summary.is_eligible_for_maturity ? 'Yes' : 'No'}`} variant='outlined' />
                  <Chip label={`Overdue: ${preview?.summary.overdue_installments ?? 0}`} variant='outlined' />
                </Stack>
              </Stack>

              <Grid container spacing={4} sx={{ mt: 2 }}>
                {[
                  ['Total Installments', preview?.summary.total_installments],
                  ['Paid Installments', preview?.summary.paid_installments],
                  ['Pending Installments', preview?.summary.pending_installments],
                  ['Overdue Installments', preview?.summary.overdue_installments],
                  ['Paid Amount', preview?.summary.paid_total],
                  ['Principal Total', preview?.summary.principal_total]
                ].map(([label, value]) => (
                  <Grid key={String(label)} size={{ xs: 12, sm: 6, xl: 4 }}>
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                      <Typography variant='body2' color='text.secondary'>
                        {label}
                      </Typography>
                      <Typography variant='subtitle1' fontWeight={700}>
                        {String(label).toLowerCase().includes('installment') ? value : money.format(Number(value || 0))}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <TableContainer component={Paper} elevation={0}>
              <Table sx={{ minWidth: 900 }}>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell>Inst.</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell align='right'>Amount</TableCell>
                    <TableCell align='right'>Penalty</TableCell>
                    <TableCell align='right'>Paid</TableCell>
                    <TableCell align='right'>Balance</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(preview?.installments || []).map(row => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.installment_no}</TableCell>
                      <TableCell>{row.due_date ? new Date(row.due_date).toLocaleDateString('en-IN') : '-'}</TableCell>
                      <TableCell align='right'>{money.format(row.amount)}</TableCell>
                      <TableCell align='right'>{money.format(row.penalty)}</TableCell>
                      <TableCell align='right'>{money.format(row.paid_amount)}</TableCell>
                      <TableCell align='right'>{money.format(row.balance_amount)}</TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          label={row.overdue ? 'Overdue' : row.paid ? 'Paid' : row.status}
                          color={row.overdue ? 'error' : row.paid ? 'success' : 'default'}
                          variant='tonal'
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!preview || preview.installments.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} align='center' sx={{ py: 8 }}>
                        <Typography variant='body2' color='text.secondary'>
                          Select a subscription to see its lifecycle summary.
                        </Typography>
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

export default SubscriptionLifecyclePage
