'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
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

type BranchOption = { id: number; name: string }

type Salesman = {
  id: number
  name: string
  email: string | null
  mobile: string | null
  status: string
  created_at: string
  branches?: BranchOption[]
}

type ResolvedRule = {
  commission_type: { id: number; code: string; name: string }
  rule_source: 'global' | 'override' | null
  rule: { calculation_type: string; value: string | number | null } | null
}

type LedgerEntry = {
  id: number
  base_amount: string | number
  commission_amount: string | number
  status: string
  event_type: string
  rule_source: string
  commission_date: string
  customer?: { id: number; name?: string | null }
  scheme?: { id: number; name: string }
  commission_type?: { id: number; name: string }
}

type MembershipRow = {
  id: number
  membership_no?: string | null
  start_date: string
  status: string
  total_paid: string | number
  customer?: { id: number; name?: string | null }
  scheme?: { id: number; name: string }
}

type CommissionType = { id: number; code: string; name: string }

type OverrideSlabForm = { from_amount: string; to_amount: string; value_type: 'FIXED' | 'PERCENTAGE'; commission_value: string }

type RawOverride = {
  id: number
  commission_type_id: number
  calculation_type: 'FIXED' | 'PERCENTAGE' | 'SLAB'
  value: string | number | null
  is_active: boolean
  priority: number
  effective_from: string | null
  effective_to: string | null
  slabs?: Array<{ id: number; from_amount: string; to_amount: string | null; value_type: string; commission_value: string }>
}

type OverrideForm = {
  id?: number
  commission_type_id: string
  calculation_type: 'FIXED' | 'PERCENTAGE' | 'SLAB'
  value: string
  is_active: boolean
  priority: string
  effective_from: string
  effective_to: string
  slabs: OverrideSlabForm[]
}

const emptySlab: OverrideSlabForm = { from_amount: '', to_amount: '', value_type: 'FIXED', commission_value: '' }

const blankOverrideForm = (commissionTypeId?: string): OverrideForm => ({
  commission_type_id: commissionTypeId ?? '',
  calculation_type: 'PERCENTAGE',
  value: '',
  is_active: true,
  priority: '0',
  effective_from: '',
  effective_to: '',
  slabs: []
})

const overrideFormFromRaw = (override: RawOverride): OverrideForm => ({
  id: override.id,
  commission_type_id: String(override.commission_type_id),
  calculation_type: override.calculation_type,
  value: override.value != null ? String(override.value) : '',
  is_active: override.is_active,
  priority: String(override.priority ?? 0),
  effective_from: override.effective_from ?? '',
  effective_to: override.effective_to ?? '',
  slabs: (override.slabs ?? []).map(s => ({
    from_amount: String(s.from_amount),
    to_amount: s.to_amount != null ? String(s.to_amount) : '',
    value_type: s.value_type as 'FIXED' | 'PERCENTAGE',
    commission_value: String(s.commission_value)
  }))
})

const resolveBackendApiUrl = getApiBaseUrl

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })

const getStatusColor = (status: string) => {
  const s = status.toLowerCase()

  if (s === 'active' || s === 'success' || s === 'paid') return 'success'
  if (s === 'pending' || s === 'approved') return 'warning'
  if (s === 'inactive' || s === 'blocked') return 'error'

  return 'default'
}

const SalesmanDetailSkeleton = () => (
  <Grid container spacing={6}>
    <Grid size={{ xs: 12 }}>
      <Skeleton variant='rectangular' height={180} sx={{ borderRadius: 2 }} />
    </Grid>
    {[1, 2, 3].map(i => (
      <Grid key={i} size={{ xs: 12, md: 4 }}>
        <Skeleton variant='rectangular' height={110} sx={{ borderRadius: 2 }} />
      </Grid>
    ))}
    <Grid size={{ xs: 12 }}>
      <Skeleton variant='rectangular' height={300} sx={{ borderRadius: 2 }} />
    </Grid>
  </Grid>
)

const SalesmanDetailPage = ({ salesmanId }: { salesmanId: number }) => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const router = useRouter()

  const [salesman, setSalesman] = useState<Salesman | null>(null)
  const [rules, setRules] = useState<ResolvedRule[]>([])
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [memberships, setMemberships] = useState<MembershipRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [commissionTypes, setCommissionTypes] = useState<CommissionType[]>([])
  const [rawOverrides, setRawOverrides] = useState<RawOverride[]>([])
  const [generating, setGenerating] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogForm, setDialogForm] = useState<OverrideForm>(blankOverrideForm())
  const [savingOverride, setSavingOverride] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
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
    },
    [accessToken]
  )

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [salesmanRes, rulesRes, ledgerRes, membershipsRes, typesRes, overridesRes] = await Promise.all([
        request<{ data: Salesman }>(`/salesmen/${salesmanId}`),
        request<{ data: ResolvedRule[] }>(`/commission/rules/${salesmanId}`).catch(() => ({ data: [] })),
        request<{ data: LedgerEntry[] }>(`/commission/ledger?salesman_id=${salesmanId}&per_page=100`).catch(() => ({ data: [] })),
        request<{ data: MembershipRow[] }>(`/memberships?user_id=${salesmanId}&per_page=100`).catch(() => ({ data: [] })),
        request<{ data: CommissionType[] }>('/commission/types?per_page=100').catch(() => ({ data: [] })),
        request<{ data: RawOverride[] }>(`/commission/salesman-overrides?salesman_id=${salesmanId}&per_page=100`).catch(() => ({ data: [] }))
      ])

      setSalesman(salesmanRes.data)
      setRules(rulesRes.data)
      setLedger(ledgerRes.data)
      setMemberships(membershipsRes.data)
      setCommissionTypes(typesRes.data)
      setRawOverrides(overridesRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load salesman details.')
    } finally {
      setLoading(false)
    }
  }, [request, salesmanId])

  useEffect(() => {
    if (accessToken) void loadAll()
  }, [accessToken, loadAll])

  const handleGenerateCommission = async () => {
    setGenerating(true)
    setError(null)

    try {
      const result = await request<{ message: string }>(`/commission/generate/${salesmanId}`, { method: 'POST' })
      await loadAll()
      alert(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate commission.')
    } finally {
      setGenerating(false)
    }
  }

  const stats = useMemo(() => {
    const paid = ledger.filter(e => e.status === 'paid').reduce((sum, e) => sum + Number(e.commission_amount || 0), 0)
    const pending = ledger.filter(e => e.status !== 'paid').reduce((sum, e) => sum + Number(e.commission_amount || 0), 0)

    return { paid, pending, enrollments: memberships.length }
  }, [ledger, memberships])

  const openSetupDialog = (commissionTypeId?: number) => {
    const existing = commissionTypeId
      ? rawOverrides.find(o => o.commission_type_id === commissionTypeId)
      : undefined

    setDialogForm(existing ? overrideFormFromRaw(existing) : blankOverrideForm(commissionTypeId ? String(commissionTypeId) : undefined))
    setOverrideError(null)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    if (savingOverride) return
    setDialogOpen(false)
  }

  const addSlab = () => setDialogForm(prev => ({ ...prev, slabs: [...prev.slabs, { ...emptySlab }] }))
  const removeSlab = (index: number) => setDialogForm(prev => ({ ...prev, slabs: prev.slabs.filter((_, i) => i !== index) }))
  const updateSlab = (index: number, field: keyof OverrideSlabForm, value: string) =>
    setDialogForm(prev => ({ ...prev, slabs: prev.slabs.map((s, i) => (i === index ? { ...s, [field]: value } : s)) }))

  const handleResetToGlobal = async () => {
    if (!dialogForm.id) return

    setSavingOverride(true)
    setOverrideError(null)

    try {
      await request(`/commission/salesman-overrides/${dialogForm.id}`, { method: 'DELETE' })
      setDialogOpen(false)
      await loadAll()
    } catch (err) {
      setOverrideError(err instanceof Error ? err.message : 'Failed to reset override.')
    } finally {
      setSavingOverride(false)
    }
  }

  const handleSaveDialog = async () => {
    if (!dialogForm.commission_type_id) {
      setOverrideError('Select a commission type.')
      return
    }

    if (dialogForm.calculation_type !== 'SLAB' && dialogForm.value === '') {
      setOverrideError('Enter a value for this calculation type.')
      return
    }

    if (dialogForm.calculation_type === 'SLAB' && dialogForm.slabs.length === 0) {
      setOverrideError('Add at least one slab band.')
      return
    }

    setSavingOverride(true)
    setOverrideError(null)

    const payload = {
      salesman_id: salesmanId,
      commission_type_id: Number(dialogForm.commission_type_id),
      calculation_type: dialogForm.calculation_type,
      value: dialogForm.calculation_type === 'SLAB' ? null : Number(dialogForm.value),
      priority: Number(dialogForm.priority || 0),
      effective_from: dialogForm.effective_from || null,
      effective_to: dialogForm.effective_to || null,
      is_active: dialogForm.is_active,
      slabs:
        dialogForm.calculation_type === 'SLAB'
          ? dialogForm.slabs.map(s => ({
              from_amount: Number(s.from_amount || 0),
              to_amount: s.to_amount === '' ? null : Number(s.to_amount),
              value_type: s.value_type,
              commission_value: Number(s.commission_value || 0)
            }))
          : []
    }

    try {
      if (dialogForm.id) {
        await request(`/commission/salesman-overrides/${dialogForm.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await request('/commission/salesman-overrides', { method: 'POST', body: JSON.stringify(payload) })
      }

      setDialogOpen(false)
      await loadAll()
    } catch (err) {
      setOverrideError(err instanceof Error ? err.message : 'Failed to save commission override.')
    } finally {
      setSavingOverride(false)
    }
  }

  if (error) {
    return (
      <Box sx={{ p: 6 }}>
        <Alert severity='error' variant='filled' sx={{ borderRadius: 2 }}>{error}</Alert>
        <Button variant='contained' onClick={() => void loadAll()} sx={{ mt: 4 }}>Retry</Button>
      </Box>
    )
  }

  if (loading || !salesman) return <SalesmanDetailSkeleton />

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            overflow: 'hidden',
            color: 'common.white',
            background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #0f766e 100%)'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 6 } }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent='space-between'
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={4}
            >
              <Stack spacing={1.5}>
                <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
                  <Typography variant='h3' sx={{ color: 'common.white', fontWeight: 800 }}>{salesman.name}</Typography>
                  <Chip
                    label={salesman.status.toUpperCase()}
                    color={getStatusColor(salesman.status)}
                    variant='tonal'
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
                <Typography sx={{ color: 'rgba(255,255,255,0.85)' }}>
                  {salesman.mobile || 'No mobile'} • {salesman.email || 'No email'}
                </Typography>
                <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                  {(salesman.branches ?? []).length ? (
                    salesman.branches!.map(b => (
                      <Chip key={b.id} size='small' label={b.name} sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'common.white' }} />
                    ))
                  ) : (
                    <Chip size='small' label='No branch assigned' sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'common.white' }} />
                  )}
                </Stack>
              </Stack>
              <Button component={Link} href='/salesmen' variant='contained' sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'common.white', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }}>
                Back to Salesman Master
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>Commission Paid</Typography>
            <Typography variant='h4' sx={{ mt: 1, fontWeight: 700, color: 'success.main' }}>{money.format(stats.paid)}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>Commission Pending</Typography>
            <Typography variant='h4' sx={{ mt: 1, fontWeight: 700, color: 'warning.main' }}>{money.format(stats.pending)}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>Memberships Enrolled</Typography>
            <Typography variant='h4' sx={{ mt: 1, fontWeight: 700 }}>{stats.enrollments}</Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ p: 4, pb: 2 }}>
              <Typography variant='h6' sx={{ fontWeight: 700 }}>Effective Commission Rules</Typography>
              <Button variant='contained' size='small' startIcon={<i className='ri-add-line' />} onClick={() => openSetupDialog()}>
                Setup Commission
              </Button>
            </Stack>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Commission Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Calculation</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Value</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography color='text.secondary' sx={{ p: 4, textAlign: 'center' }}>No commission types configured.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {rules.map(r => (
                    <TableRow key={r.commission_type.id} hover>
                      <TableCell>{r.commission_type.name}</TableCell>
                      <TableCell>
                        {r.rule_source ? (
                          <Chip
                            size='small'
                            label={r.rule_source === 'override' ? 'Salesman Override' : 'Global'}
                            color={r.rule_source === 'override' ? 'info' : 'default'}
                            variant='tonal'
                            sx={{ textTransform: 'capitalize' }}
                          />
                        ) : (
                          <Chip size='small' label='No rule' variant='outlined' />
                        )}
                      </TableCell>
                      <TableCell>{r.rule?.calculation_type ?? '—'}</TableCell>
                      <TableCell>
                        {r.rule
                          ? r.rule.calculation_type === 'PERCENTAGE'
                            ? `${r.rule.value}%`
                            : r.rule.calculation_type === 'FIXED'
                              ? money.format(Number(r.rule.value ?? 0))
                              : 'Slab-based'
                          : '—'}
                      </TableCell>
                      <TableCell align='right'>
                        <IconButton size='small' onClick={() => openSetupDialog(r.commission_type.id)}>
                          <i className='ri-edit-line' style={{ fontSize: '1.1rem' }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ p: 4, pb: 2 }}>
              <Typography variant='h6' sx={{ fontWeight: 700 }}>Commission Ledger</Typography>
              <Button
                variant='outlined'
                size='small'
                startIcon={generating ? <CircularProgress size={16} /> : <i className='ri-refresh-line' />}
                onClick={() => void handleGenerateCommission()}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate Commission'}
              </Button>
            </Stack>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600 }}>Commission</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledger.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography color='text.secondary' sx={{ p: 4, textAlign: 'center' }}>No commission earned yet.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {ledger.map(entry => (
                    <TableRow key={entry.id} hover>
                      <TableCell>{new Date(entry.commission_date).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell>{entry.customer?.name ?? '—'}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{entry.commission_type?.name ?? entry.event_type}</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 600 }}>{money.format(Number(entry.commission_amount))}</TableCell>
                      <TableCell>
                        <Chip size='small' label={entry.status} color={getStatusColor(entry.status)} variant='tonal' sx={{ textTransform: 'capitalize' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Typography variant='h6' sx={{ p: 4, pb: 2, fontWeight: 700 }}>Memberships Enrolled</Typography>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Scheme</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {memberships.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography color='text.secondary' sx={{ p: 4, textAlign: 'center' }}>No memberships enrolled yet.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {memberships.map(m => (
                    <TableRow
                      key={m.id}
                      hover
                      onClick={() => router.push(`/subscriptions/${m.id}`)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{m.customer?.name ?? '—'}</TableCell>
                      <TableCell>{m.scheme?.name ?? '—'}</TableCell>
                      <TableCell>
                        <Chip size='small' label={m.status} color={getStatusColor(m.status)} variant='tonal' sx={{ textTransform: 'capitalize' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth='sm' fullWidth>
        <DialogTitle>{dialogForm.id ? 'Edit Commission Override' : 'Setup Commission Override'}</DialogTitle>
        <DialogContent>
          <Stack spacing={4} sx={{ mt: 1 }}>
            {overrideError && <Alert severity='error'>{overrideError}</Alert>}

            <TextField
              select
              fullWidth
              label='Commission Type'
              value={dialogForm.commission_type_id}
              onChange={e => setDialogForm({ ...dialogForm, commission_type_id: e.target.value })}
            >
              {commissionTypes.map(t => (
                <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label='Calculation Type'
              value={dialogForm.calculation_type}
              onChange={e => setDialogForm({ ...dialogForm, calculation_type: e.target.value as OverrideForm['calculation_type'] })}
            >
              <MenuItem value='FIXED'>Fixed Amount</MenuItem>
              <MenuItem value='PERCENTAGE'>Percentage</MenuItem>
              <MenuItem value='SLAB'>Slab</MenuItem>
            </TextField>

            {dialogForm.calculation_type !== 'SLAB' ? (
              <TextField
                fullWidth
                type='number'
                label={dialogForm.calculation_type === 'PERCENTAGE' ? 'Percentage (%)' : 'Fixed Amount (₹)'}
                value={dialogForm.value}
                onChange={e => setDialogForm({ ...dialogForm, value: e.target.value })}
              />
            ) : (
              <Stack spacing={3}>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Typography variant='subtitle2'>Slab Bands</Typography>
                  <Button size='small' startIcon={<i className='ri-add-line' />} onClick={addSlab}>Add Slab</Button>
                </Stack>
                {dialogForm.slabs.map((slab, index) => (
                  <Stack key={index} direction='row' spacing={2} alignItems='center'>
                    <TextField
                      size='small'
                      type='number'
                      label='From'
                      value={slab.from_amount}
                      onChange={e => updateSlab(index, 'from_amount', e.target.value)}
                    />
                    <TextField
                      size='small'
                      type='number'
                      label='To (blank = no limit)'
                      value={slab.to_amount}
                      onChange={e => updateSlab(index, 'to_amount', e.target.value)}
                    />
                    <TextField
                      select
                      size='small'
                      label='Type'
                      sx={{ minWidth: 120 }}
                      value={slab.value_type}
                      onChange={e => updateSlab(index, 'value_type', e.target.value)}
                    >
                      <MenuItem value='FIXED'>Fixed ₹</MenuItem>
                      <MenuItem value='PERCENTAGE'>Percent %</MenuItem>
                    </TextField>
                    <TextField
                      size='small'
                      type='number'
                      label='Value'
                      value={slab.commission_value}
                      onChange={e => updateSlab(index, 'commission_value', e.target.value)}
                    />
                    <IconButton size='small' color='error' onClick={() => removeSlab(index)}>
                      <i className='ri-delete-bin-line' />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}

            <Stack direction='row' spacing={3}>
              <TextField
                fullWidth
                type='number'
                label='Priority (lower = evaluated first)'
                value={dialogForm.priority}
                onChange={e => setDialogForm({ ...dialogForm, priority: e.target.value })}
              />
              <FormControlLabel
                sx={{ whiteSpace: 'nowrap' }}
                control={
                  <Checkbox
                    checked={dialogForm.is_active}
                    onChange={e => setDialogForm({ ...dialogForm, is_active: e.target.checked })}
                  />
                }
                label='Active'
              />
            </Stack>

            <Stack direction='row' spacing={3}>
              <TextField
                fullWidth
                type='date'
                label='Effective From'
                InputLabelProps={{ shrink: true }}
                value={dialogForm.effective_from}
                onChange={e => setDialogForm({ ...dialogForm, effective_from: e.target.value })}
              />
              <TextField
                fullWidth
                type='date'
                label='Effective To'
                InputLabelProps={{ shrink: true }}
                value={dialogForm.effective_to}
                onChange={e => setDialogForm({ ...dialogForm, effective_to: e.target.value })}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          {dialogForm.id && (
            <Button color='warning' onClick={() => void handleResetToGlobal()} disabled={savingOverride} sx={{ mr: 'auto' }}>
              Reset to Global
            </Button>
          )}
          <Button onClick={closeDialog} disabled={savingOverride}>Cancel</Button>
          <Button variant='contained' onClick={() => void handleSaveDialog()} disabled={savingOverride}>
            {savingOverride ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default SalesmanDetailPage
