'use client'

import { useCallback, useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { getApiBaseUrl } from '@/libs/runtimeConfig'

const resolveBackendApiUrl = getApiBaseUrl

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })

type MembershipInfo = {
  id: number
  membership_no?: string | null
  start_date: string
  maturity_date: string
  total_paid: string | number
  status: string
  customer?: { name?: string | null; mobile?: string | null } | null
  scheme?: {
    name: string
    code: string
    scheme_type?: string | null
    installment_value?: string | number | null
    total_installments?: number | null
  } | null
  installments?: Array<{ paid: boolean }>
}

type VoucherLine = {
  ledger_name: string
  ledger_code: string | null
  debit: number
  credit: number
  remarks: string
}

type Bonus = {
  amount: number
  source: string | null
  ledger_account: string | null
  detail: string
}

type ClosingPreview = {
  eligible: boolean
  current_status: string
  is_fully_paid: boolean
  remaining_amount: number
  maturity_date: string
  is_matured_date_reached: boolean
  reasons: string[]
  bonus: Bonus
  entry_no: string
  narration: string
  voucher_lines: VoucherLine[]
}

type ForceClosingPreview = {
  eligible: boolean
  current_status: string
  reasons: string[]
  total_paid: number
  penalty_percent: number
  penalty_amount: number
  lock_in_months: number
  elapsed_months: number
  lock_in_passed: boolean
  bonus: Bonus
  payout_amount: number
  entry_no: string
  narration: string
  voucher_lines: VoucherLine[]
}

const SchemeClosingPreviewPage = ({ membershipId }: { membershipId: number }) => {
  const router = useRouter()
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [membership, setMembership] = useState<MembershipInfo | null>(null)
  const [mode, setMode] = useState<'close' | 'force-close' | null>(null)
  const [closingPreview, setClosingPreview] = useState<ClosingPreview | null>(null)
  const [forceClosePreview, setForceClosePreview] = useState<ForceClosingPreview | null>(null)
  const [narration, setNarration] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const request = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    if (!accessToken) throw new Error('Missing access token')

    const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {})
      }
    })

    const payload = (await response.json().catch(() => null)) as { message?: string } | null

    if (!response.ok) throw new Error(payload?.message || 'Request failed')

    return payload as T
  }, [accessToken])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const membershipResponse = await request<{ data: MembershipInfo }>(`/memberships/${membershipId}`)

      setMembership(membershipResponse.data)

      const closeResponse = await request<{ data: ClosingPreview }>(`/memberships/${membershipId}/closing-preview`)

      if (closeResponse.data.eligible) {
        setClosingPreview(closeResponse.data)
        setNarration(closeResponse.data.narration)
        setMode('close')
      } else {
        const forceResponse = await request<{ data: ForceClosingPreview }>(`/memberships/${membershipId}/force-closing-preview`)

        setForceClosePreview(forceResponse.data)
        setNarration(forceResponse.data.narration)
        setMode('force-close')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scheme closure preview.')
    } finally {
      setLoading(false)
    }
  }, [membershipId, request])

  useEffect(() => {
    if (!accessToken) return
    void load()
  }, [accessToken, load])

  const handleApprove = async () => {
    setSaving(true)
    setError(null)

    try {
      const endpoint = mode === 'force-close'
        ? `/memberships/${membershipId}/force-close`
        : `/memberships/${membershipId}/close`

      await request(endpoint, { method: 'POST', body: JSON.stringify({ narration }) })
      router.push(`/membership/${membershipId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close scheme.')
    } finally {
      setSaving(false)
    }
  }

  const handleExportPdf = async () => {
    if (!accessToken) return

    setDownloading(true)
    try {
      const response = await fetch(`${resolveBackendApiUrl()}/memberships/${membershipId}/closing-preview/pdf`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (!response.ok) throw new Error('Failed to export PDF.')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `scheme-closure-${membership?.membership_no || membershipId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <Stack alignItems='center' sx={{ mt: 10 }}>
        <CircularProgress />
      </Stack>
    )
  }

  if (!membership || (mode === 'close' && !closingPreview) || (mode === 'force-close' && !forceClosePreview)) {
    return (
      <Box sx={{ p: 6 }}>
        <Alert severity='error' variant='filled'>{error || 'Scheme closure preview not found.'}</Alert>
        <Button variant='contained' onClick={() => router.back()} sx={{ mt: 4 }}>Back</Button>
      </Box>
    )
  }

  const paidInstallments = membership.installments?.filter(i => i.paid).length || 0
  const totalInstallments = membership.installments?.length || membership.scheme?.total_installments || 0
  const totalPaid = Number(membership.total_paid || 0)
  const entryNo = mode === 'force-close' ? forceClosePreview!.entry_no : closingPreview!.entry_no
  const eligible = mode === 'force-close' ? forceClosePreview!.eligible : closingPreview!.eligible
  const reasons = mode === 'force-close' ? forceClosePreview!.reasons : closingPreview!.reasons
  const bonus = mode === 'force-close' ? forceClosePreview!.bonus : closingPreview!.bonus
  const voucherLines = mode === 'force-close' ? forceClosePreview!.voucher_lines : closingPreview!.voucher_lines
  const totalDebit = voucherLines.reduce((sum, l) => sum + l.debit, 0)
  const totalCredit = voucherLines.reduce((sum, l) => sum + l.credit, 0)

  const infoCards = [
    { label: 'Customer Name', value: membership.customer?.name || 'Unknown customer', sub: membership.customer?.mobile || 'N/A', icon: 'ri-user-line' },
    { label: 'Scheme No.', value: membership.scheme?.code || 'No code', sub: `Started ${new Date(membership.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`, icon: 'ri-file-list-3-line' },
    { label: 'Scheme Type', value: membership.scheme?.scheme_type || 'N/A', sub: `${totalInstallments} Months`, icon: 'ri-stack-line' },
    { label: 'Payment Plan', value: `${paidInstallments} / ${totalInstallments} Paid`, sub: `Matures ${new Date(membership.maturity_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`, icon: 'ri-calendar-check-line' }
  ]

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems={{ xs: 'flex-start', md: 'center' }} spacing={3} sx={{ mb: 4 }}>
        <Box>
          <Typography variant='h4' sx={{ fontWeight: 700 }}>
            {mode === 'force-close' ? 'Force Close Scheme Preview' : 'Gold Scheme Closure Preview'}
          </Typography>
          <Typography variant='body2' color='text.secondary'>Review scheme closure details before finalizing</Typography>
        </Box>
        <Stack direction='row' spacing={2} alignItems='center'>
          <Chip label={`Entry No: ${entryNo}`} variant='outlined' />
          <Button variant='outlined' onClick={() => void handleExportPdf()} disabled={downloading} startIcon={<i className='ri-file-download-line' />}>
            {downloading ? 'Preparing...' : 'Export PDF'}
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity='error' sx={{ mb: 4 }}>{error}</Alert>}

      {/* Info cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {infoCards.map(card => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant='outlined'>
              <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={card.icon} style={{ fontSize: '1.1rem' }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='caption' color='text.secondary' display='block'>{card.label}</Typography>
                  <Typography variant='body1' fontWeight={700} noWrap>{card.value}</Typography>
                  <Typography variant='caption' color='text.secondary'>{card.sub}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        {/* Summary panel */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant='outlined' sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant='overline' color='text.secondary'>
                {mode === 'force-close' ? 'Settlement Calculation' : 'Scheme Closure Summary'}
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {mode === 'force-close' ? (
                  <>
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='body2' color='text.secondary'>Total Paid</Typography>
                      <Typography variant='body2' fontWeight={600}>{money.format(forceClosePreview!.total_paid)}</Typography>
                    </Stack>
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='body2' color='text.secondary'>Closing Penalty ({forceClosePreview!.penalty_percent}%)</Typography>
                      <Typography variant='body2' fontWeight={600} color='error.main'>- {money.format(forceClosePreview!.penalty_amount)}</Typography>
                    </Stack>
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='body2' color='text.secondary'>
                        Maturity Bonus {forceClosePreview!.lock_in_passed ? '' : '(forfeited)'}
                      </Typography>
                      <Typography variant='body2' fontWeight={600} color={bonus.amount > 0 ? 'success.main' : 'text.secondary'}>
                        {bonus.amount > 0 ? `+ ${money.format(bonus.amount)}` : money.format(0)}
                      </Typography>
                    </Stack>
                    <Divider />
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='body1' fontWeight={700}>Customer Receives</Typography>
                      <Typography variant='h6' fontWeight={700}>{money.format(forceClosePreview!.payout_amount)}</Typography>
                    </Stack>
                  </>
                ) : (
                  <>
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='body2' color='text.secondary'>Installments Paid</Typography>
                      <Typography variant='body2' fontWeight={600}>{paidInstallments} / {totalInstallments}</Typography>
                    </Stack>
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='body2' color='text.secondary'>Total Customer Paid</Typography>
                      <Typography variant='body2' fontWeight={600}>{money.format(totalPaid)}</Typography>
                    </Stack>
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='body2' color='text.secondary'>Remaining Payable</Typography>
                      <Typography variant='body2' fontWeight={600}>{money.format(closingPreview!.remaining_amount)}</Typography>
                    </Stack>
                    <Divider />
                    <Stack direction='row' justifyContent='space-between'>
                      <Typography variant='body1' fontWeight={700}>Maturity Benefit</Typography>
                      <Typography variant='h6' fontWeight={700}>{money.format(bonus.amount)}</Typography>
                    </Stack>
                    <Typography variant='caption' color='text.secondary'>{bonus.detail}</Typography>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Status panel */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant='outlined' sx={{ height: '100%' }}>
            <CardContent>
              <Alert severity={eligible ? (mode === 'force-close' ? 'warning' : 'success') : 'error'} sx={{ mb: 3 }}>
                {eligible
                  ? mode === 'force-close'
                    ? 'This membership is not yet fully paid / matured. Closing now is an early exit — a closing penalty applies and cannot be undone.'
                    : 'This membership is fully paid and matured — ready to close.'
                  : reasons.join(' ')}
              </Alert>

              <Typography variant='overline' color='text.secondary'>Narration</Typography>
              <TextField
                fullWidth
                multiline
                minRows={2}
                value={narration}
                onChange={e => setNarration(e.target.value)}
                sx={{ mt: 1, mb: 3 }}
              />

              <Chip
                label={`Status: ${membership.status}`}
                color={membership.status === 'active' || membership.status === 'paused' ? 'default' : 'primary'}
                variant='tonal'
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Accounting entry preview */}
      <Card variant='outlined' sx={{ mb: 4 }}>
        <CardContent sx={{ p: 0 }}>
          <Typography variant='h6' sx={{ p: 4, pb: 2, fontWeight: 700 }}>Accounting Entry Preview</Typography>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>S.No</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Ledger Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Ledger Code</TableCell>
                  <TableCell align='right' sx={{ fontWeight: 600 }}>Debit (₹)</TableCell>
                  <TableCell align='right' sx={{ fontWeight: 600 }}>Credit (₹)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {voucherLines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align='center' sx={{ py: 4, color: 'text.secondary' }}>
                      No ledger entries to post.
                    </TableCell>
                  </TableRow>
                ) : (
                  voucherLines.map((line, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{line.ledger_name}</TableCell>
                      <TableCell>{line.ledger_code || '-'}</TableCell>
                      <TableCell align='right'>{line.debit > 0 ? money.format(line.debit) : '-'}</TableCell>
                      <TableCell align='right'>{line.credit > 0 ? money.format(line.credit) : '-'}</TableCell>
                      <TableCell>{line.remarks}</TableCell>
                    </TableRow>
                  ))
                )}
                {voucherLines.length > 0 && (
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Total</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700 }}>{money.format(totalDebit)}</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700 }}>{money.format(totalCredit)}</TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Actions */}
      <Stack direction='row' justifyContent='space-between' spacing={2}>
        <Stack direction='row' spacing={2}>
          <Button variant='outlined' onClick={() => router.push(`/membership/${membershipId}`)} disabled={saving}>Cancel</Button>
          <Button variant='outlined' onClick={() => router.back()} disabled={saving}>Back</Button>
        </Stack>
        <Button
          variant='contained'
          color={mode === 'force-close' ? 'error' : 'primary'}
          startIcon={<i className='ri-lock-line' />}
          onClick={() => void handleApprove()}
          disabled={saving || !eligible}
        >
          {saving ? 'Closing...' : mode === 'force-close' ? 'Approve & Force Close' : 'Approve & Close Scheme'}
        </Button>
      </Stack>
    </Box>
  )
}

export default SchemeClosingPreviewPage
