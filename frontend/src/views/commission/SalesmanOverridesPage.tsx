'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
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

type CommissionType = { id: number; code: string; name: string }
type UserOption = { id: number; name: string }

type Slab = { from_amount: string; to_amount: string; value_type: 'FIXED' | 'PERCENTAGE'; commission_value: string }

type SalesmanOverride = {
  id: number
  salesman_id: number
  commission_type_id: number
  calculation_type: 'FIXED' | 'PERCENTAGE' | 'SLAB'
  value: string | number | null
  is_active: boolean
  priority: number
  effective_from: string | null
  effective_to: string | null
  salesman?: UserOption
  commission_type?: CommissionType
  slabs?: Array<{ id: number; from_amount: string; to_amount: string | null; value_type: string; commission_value: string }>
}

const resolveBackendApiUrl = getApiBaseUrl

const emptyForm = {
  salesman_id: '',
  commission_type_id: '',
  calculation_type: 'PERCENTAGE' as 'FIXED' | 'PERCENTAGE' | 'SLAB',
  value: '',
  priority: '0',
  effective_from: '',
  effective_to: ''
}

const emptySlab: Slab = { from_amount: '', to_amount: '', value_type: 'FIXED', commission_value: '' }

const SalesmanOverridesPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const searchParams = useSearchParams()
  const focusSalesmanId = searchParams.get('salesman_id')
  const autoOpenedRef = useRef(false)

  const [users, setUsers] = useState<UserOption[]>([])
  const [types, setTypes] = useState<CommissionType[]>([])
  const [overrides, setOverrides] = useState<SalesmanOverride[]>([])
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [slabs, setSlabs] = useState<Slab[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [usersRes, typesRes, overridesRes] = await Promise.all([
        request<{ data: UserOption[] }>('/users?per_page=200&sort_by=name&sort_direction=asc'),
        request<{ data: CommissionType[] }>('/commission/types?per_page=100'),
        request<{ data: SalesmanOverride[] }>('/commission/salesman-overrides?per_page=100')
      ])

      setUsers(usersRes.data)
      setTypes(typesRes.data)
      setOverrides(overridesRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load salesman overrides.')
    } finally {
      setLoading(false)
      setDataLoaded(true)
    }
  }, [request])

  useEffect(() => {
    if (status === 'authenticated') void loadData()
  }, [status, loadData])

  const visibleOverrides = focusSalesmanId
    ? overrides.filter(o => String(o.salesman_id) === focusSalesmanId)
    : overrides

  const focusSalesmanName = focusSalesmanId
    ? users.find(u => String(u.id) === focusSalesmanId)?.name ?? `#${focusSalesmanId}`
    : null

  const openCreate = (presetSalesmanId?: string) => {
    setEditingId(null)
    setForm({ ...emptyForm, salesman_id: presetSalesmanId ?? '' })
    setSlabs([])
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (override: SalesmanOverride) => {
    setEditingId(override.id)
    setForm({
      salesman_id: String(override.salesman_id),
      commission_type_id: String(override.commission_type_id),
      calculation_type: override.calculation_type,
      value: override.value != null ? String(override.value) : '',
      priority: String(override.priority ?? 0),
      effective_from: override.effective_from ?? '',
      effective_to: override.effective_to ?? ''
    })
    setSlabs(
      (override.slabs ?? []).map(s => ({
        from_amount: String(s.from_amount),
        to_amount: s.to_amount != null ? String(s.to_amount) : '',
        value_type: s.value_type as 'FIXED' | 'PERCENTAGE',
        commission_value: String(s.commission_value)
      }))
    )
    setFormError(null)
    setDialogOpen(true)
  }

  useEffect(() => {
    if (!focusSalesmanId || !dataLoaded || autoOpenedRef.current) return

    autoOpenedRef.current = true

    const existing = overrides.find(o => String(o.salesman_id) === focusSalesmanId)

    if (existing) {
      openEdit(existing)
    } else {
      openCreate(focusSalesmanId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSalesmanId, dataLoaded, overrides])

  const closeDialog = () => {
    if (saving) return
    setDialogOpen(false)
  }

  const handleSave = async () => {
    if (!form.salesman_id || !form.commission_type_id) {
      setFormError('Select a salesman and a commission type.')
      return
    }

    if (form.calculation_type !== 'SLAB' && form.value === '') {
      setFormError('Enter a value for this calculation type.')
      return
    }

    if (form.calculation_type === 'SLAB' && slabs.length === 0) {
      setFormError('Add at least one slab band.')
      return
    }

    setSaving(true)
    setFormError(null)

    const payload = {
      salesman_id: Number(form.salesman_id),
      commission_type_id: Number(form.commission_type_id),
      calculation_type: form.calculation_type,
      value: form.calculation_type === 'SLAB' ? null : Number(form.value),
      priority: Number(form.priority || 0),
      effective_from: form.effective_from || null,
      effective_to: form.effective_to || null,
      is_active: true,
      slabs:
        form.calculation_type === 'SLAB'
          ? slabs.map(s => ({
              from_amount: Number(s.from_amount || 0),
              to_amount: s.to_amount === '' ? null : Number(s.to_amount),
              value_type: s.value_type,
              commission_value: Number(s.commission_value || 0)
            }))
          : []
    }

    try {
      if (editingId) {
        await request(`/commission/salesman-overrides/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await request('/commission/salesman-overrides', { method: 'POST', body: JSON.stringify(payload) })
      }

      setDialogOpen(false)
      await loadData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save override.')
    } finally {
      setSaving(false)
    }
  }

  const handleResetToGlobal = async (override: SalesmanOverride) => {
    try {
      await request(`/commission/salesman-overrides/${override.id}`, { method: 'DELETE' })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset override.')
    }
  }

  const addSlabRow = () => setSlabs(prev => [...prev, { ...emptySlab }])
  const removeSlabRow = (index: number) => setSlabs(prev => prev.filter((_, i) => i !== index))
  const updateSlabRow = (index: number, field: keyof Slab, value: string) =>
    setSlabs(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }} display='flex' justifyContent='space-between' alignItems='center'>
        <Box>
          <Typography variant='h4' sx={{ mb: 1, fontWeight: 600 }}>Salesman Override Manager</Typography>
          <Typography color='text.secondary'>
            Salesman-specific commission rules. An active override always wins over the matching global rule.
          </Typography>
        </Box>
        <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={() => openCreate(focusSalesmanId ?? undefined)}>
          New Override
        </Button>
      </Grid>

      {focusSalesmanId && (
        <Grid size={{ xs: 12 }}>
          <Alert
            severity='info'
            action={<Button component={Link} href='/commission/overrides' color='inherit' size='small'>Show All</Button>}
          >
            Showing commission setup for <strong>{focusSalesmanName}</strong> only.
          </Alert>
        </Grid>
      )}

      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error'>{error}</Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box display='flex' justifyContent='center' p={10}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Salesman</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Commission Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Calculation</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Value</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Effective Window</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleOverrides.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Typography color='text.secondary' sx={{ p: 4, textAlign: 'center' }}>
                            {focusSalesmanId ? 'No commission overrides for this salesman yet.' : 'No salesman overrides yet.'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {visibleOverrides.map(override => (
                      <TableRow key={override.id} hover>
                        <TableCell>{override.salesman?.name ?? `#${override.salesman_id}`}</TableCell>
                        <TableCell>{override.commission_type?.name ?? '—'}</TableCell>
                        <TableCell>{override.calculation_type}</TableCell>
                        <TableCell>
                          {override.calculation_type === 'SLAB'
                            ? `${override.slabs?.length ?? 0} slab band(s)`
                            : override.calculation_type === 'PERCENTAGE'
                              ? `${override.value}%`
                              : `₹${override.value}`}
                        </TableCell>
                        <TableCell>
                          {override.effective_from || '—'} {override.effective_to ? `to ${override.effective_to}` : ''}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            label={override.is_active ? 'Active' : 'Reset to Global'}
                            color={override.is_active ? 'success' : 'default'}
                            variant='tonal'
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <IconButton size='small' onClick={() => openEdit(override)}>
                            <i className='ri-edit-line' style={{ fontSize: '1.1rem' }} />
                          </IconButton>
                          {override.is_active && (
                            <IconButton size='small' color='warning' onClick={() => handleResetToGlobal(override)} title='Reset to Global'>
                              <i className='ri-refresh-line' style={{ fontSize: '1.1rem' }} />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth='sm' fullWidth>
        <DialogTitle>{editingId ? 'Edit Salesman Override' : 'New Salesman Override'}</DialogTitle>
        <DialogContent>
          <Stack spacing={4} sx={{ mt: 1 }}>
            {formError && <Alert severity='error'>{formError}</Alert>}

            <TextField
              select
              fullWidth
              label='Salesman'
              value={form.salesman_id}
              onChange={e => setForm({ ...form, salesman_id: e.target.value })}
            >
              {users.map(u => (
                <MenuItem key={u.id} value={String(u.id)}>{u.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label='Commission Type'
              value={form.commission_type_id}
              onChange={e => setForm({ ...form, commission_type_id: e.target.value })}
            >
              {types.map(t => (
                <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label='Calculation Type'
              value={form.calculation_type}
              onChange={e => setForm({ ...form, calculation_type: e.target.value as typeof form.calculation_type })}
            >
              <MenuItem value='FIXED'>Fixed Amount</MenuItem>
              <MenuItem value='PERCENTAGE'>Percentage</MenuItem>
              <MenuItem value='SLAB'>Slab</MenuItem>
            </TextField>

            {form.calculation_type !== 'SLAB' ? (
              <TextField
                fullWidth
                type='number'
                label={form.calculation_type === 'PERCENTAGE' ? 'Percentage (%)' : 'Fixed Amount (₹)'}
                value={form.value}
                onChange={e => setForm({ ...form, value: e.target.value })}
              />
            ) : (
              <Stack spacing={3}>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Typography variant='subtitle2'>Slab Bands</Typography>
                  <Button size='small' startIcon={<i className='ri-add-line' />} onClick={addSlabRow}>Add Slab</Button>
                </Stack>
                {slabs.map((slab, index) => (
                  <Stack key={index} direction='row' spacing={2} alignItems='center'>
                    <TextField
                      size='small'
                      type='number'
                      label='From'
                      value={slab.from_amount}
                      onChange={e => updateSlabRow(index, 'from_amount', e.target.value)}
                    />
                    <TextField
                      size='small'
                      type='number'
                      label='To (blank = no limit)'
                      value={slab.to_amount}
                      onChange={e => updateSlabRow(index, 'to_amount', e.target.value)}
                    />
                    <TextField
                      select
                      size='small'
                      label='Type'
                      sx={{ minWidth: 120 }}
                      value={slab.value_type}
                      onChange={e => updateSlabRow(index, 'value_type', e.target.value)}
                    >
                      <MenuItem value='FIXED'>Fixed ₹</MenuItem>
                      <MenuItem value='PERCENTAGE'>Percent %</MenuItem>
                    </TextField>
                    <TextField
                      size='small'
                      type='number'
                      label='Value'
                      value={slab.commission_value}
                      onChange={e => updateSlabRow(index, 'commission_value', e.target.value)}
                    />
                    <IconButton size='small' color='error' onClick={() => removeSlabRow(index)}>
                      <i className='ri-delete-bin-line' />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}

            <TextField
              fullWidth
              type='number'
              label='Priority (lower = evaluated first)'
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
            />

            <Stack direction='row' spacing={3}>
              <TextField
                fullWidth
                type='date'
                label='Effective From'
                InputLabelProps={{ shrink: true }}
                value={form.effective_from}
                onChange={e => setForm({ ...form, effective_from: e.target.value })}
              />
              <TextField
                fullWidth
                type='date'
                label='Effective To'
                InputLabelProps={{ shrink: true }}
                value={form.effective_to}
                onChange={e => setForm({ ...form, effective_to: e.target.value })}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button variant='contained' onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default SalesmanOverridesPage
