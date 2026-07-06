'use client'

import { useCallback, useEffect, useState } from 'react'

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

type Slab = { from_amount: string; to_amount: string; value_type: 'FIXED' | 'PERCENTAGE'; commission_value: string }

type CommissionRule = {
  id: number
  commission_type_id: number
  calculation_type: 'FIXED' | 'PERCENTAGE' | 'SLAB'
  value: string | number | null
  priority: number
  effective_from: string | null
  effective_to: string | null
  status: string
  commission_type?: CommissionType
  slabs?: Array<{ id: number; from_amount: string; to_amount: string | null; value_type: string; commission_value: string }>
}

const resolveBackendApiUrl = getApiBaseUrl

const emptyForm = {
  commission_type_id: '',
  calculation_type: 'PERCENTAGE' as 'FIXED' | 'PERCENTAGE' | 'SLAB',
  value: '',
  priority: '0',
  effective_from: '',
  effective_to: '',
  status: 'active'
}

const emptySlab: Slab = { from_amount: '', to_amount: '', value_type: 'FIXED', commission_value: '' }

const CommissionRulesPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [types, setTypes] = useState<CommissionType[]>([])
  const [rules, setRules] = useState<CommissionRule[]>([])
  const [loading, setLoading] = useState(false)
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
      const [typesRes, rulesRes] = await Promise.all([
        request<{ data: CommissionType[] }>('/commission/types?per_page=100'),
        request<{ data: CommissionRule[] }>('/commission/global-rules?per_page=100&sort_by=priority&sort_direction=asc')
      ])

      setTypes(typesRes.data)
      setRules(rulesRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load commission rules.')
    } finally {
      setLoading(false)
    }
  }, [request])

  useEffect(() => {
    if (status === 'authenticated') void loadData()
  }, [status, loadData])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setSlabs([])
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (rule: CommissionRule) => {
    setEditingId(rule.id)
    setForm({
      commission_type_id: String(rule.commission_type_id),
      calculation_type: rule.calculation_type,
      value: rule.value != null ? String(rule.value) : '',
      priority: String(rule.priority ?? 0),
      effective_from: rule.effective_from ?? '',
      effective_to: rule.effective_to ?? '',
      status: rule.status
    })
    setSlabs(
      (rule.slabs ?? []).map(s => ({
        from_amount: String(s.from_amount),
        to_amount: s.to_amount != null ? String(s.to_amount) : '',
        value_type: s.value_type as 'FIXED' | 'PERCENTAGE',
        commission_value: String(s.commission_value)
      }))
    )
    setFormError(null)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    if (saving) return
    setDialogOpen(false)
  }

  const handleSave = async () => {
    if (!form.commission_type_id) {
      setFormError('Select a commission type.')
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
      commission_type_id: Number(form.commission_type_id),
      calculation_type: form.calculation_type,
      value: form.calculation_type === 'SLAB' ? null : Number(form.value),
      priority: Number(form.priority || 0),
      effective_from: form.effective_from || null,
      effective_to: form.effective_to || null,
      status: form.status,
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
        await request(`/commission/global-rules/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await request('/commission/global-rules', { method: 'POST', body: JSON.stringify(payload) })
      }

      setDialogOpen(false)
      await loadData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save commission rule.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (rule: CommissionRule) => {
    try {
      await request(`/commission/global-rules/${rule.id}`, { method: 'DELETE' })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate rule.')
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
          <Typography variant='h4' sx={{ mb: 1, fontWeight: 600 }}>Commission Setup</Typography>
          <Typography color='text.secondary'>
            Default commission rules applied to every salesman, unless a salesman-specific override takes precedence.
          </Typography>
        </Box>
        <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={openCreate}>
          New Rule
        </Button>
      </Grid>

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
                      <TableCell sx={{ fontWeight: 600 }}>Commission Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Calculation</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Value</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Effective Window</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Typography color='text.secondary' sx={{ p: 4, textAlign: 'center' }}>
                            No global commission rules yet.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {rules.map(rule => (
                      <TableRow key={rule.id} hover>
                        <TableCell>{rule.commission_type?.name ?? '—'}</TableCell>
                        <TableCell>{rule.calculation_type}</TableCell>
                        <TableCell>
                          {rule.calculation_type === 'SLAB'
                            ? `${rule.slabs?.length ?? 0} slab band(s)`
                            : rule.calculation_type === 'PERCENTAGE'
                              ? `${rule.value}%`
                              : `₹${rule.value}`}
                        </TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>
                          {rule.effective_from || '—'} {rule.effective_to ? `to ${rule.effective_to}` : ''}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            label={rule.status}
                            color={rule.status === 'active' ? 'success' : 'default'}
                            variant='tonal'
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <IconButton size='small' onClick={() => openEdit(rule)}>
                            <i className='ri-edit-line' style={{ fontSize: '1.1rem' }} />
                          </IconButton>
                          {rule.status === 'active' && (
                            <IconButton size='small' color='error' onClick={() => handleDeactivate(rule)}>
                              <i className='ri-forbid-line' style={{ fontSize: '1.1rem' }} />
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
        <DialogTitle>{editingId ? 'Edit Commission Rule' : 'New Global Commission Rule'}</DialogTitle>
        <DialogContent>
          <Stack spacing={4} sx={{ mt: 1 }}>
            {formError && <Alert severity='error'>{formError}</Alert>}

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

            <Stack direction='row' spacing={3}>
              <TextField
                fullWidth
                type='number'
                label='Priority (lower = evaluated first)'
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
              />
              <TextField
                select
                fullWidth
                label='Status'
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                <MenuItem value='active'>Active</MenuItem>
                <MenuItem value='inactive'>Inactive</MenuItem>
              </TextField>
            </Stack>

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

export default CommissionRulesPage
