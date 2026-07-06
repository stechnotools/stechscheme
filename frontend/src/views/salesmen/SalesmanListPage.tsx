'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

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
import InputAdornment from '@mui/material/InputAdornment'
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

type BranchOption = { id: number; name: string }

type Salesman = {
  id: number
  name: string
  email: string | null
  mobile: string | null
  status: string
  branches?: BranchOption[]
}

const resolveBackendApiUrl = getApiBaseUrl

const emptyForm = {
  name: '',
  email: '',
  mobile: '',
  password: '',
  status: 'active',
  branch_ids: [] as number[]
}

const SalesmanListPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [salesmen, setSalesmen] = useState<Salesman[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Salesman | null>(null)

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
      const [salesmenRes, branchesRes] = await Promise.all([
        request<{ data: Salesman[] }>(`/salesmen?per_page=200&sort_by=name&sort_direction=asc${search ? `&search=${encodeURIComponent(search)}` : ''}`),
        request<{ data: BranchOption[] }>('/branches?per_page=200&sort_by=name&sort_direction=asc')
      ])

      setSalesmen(salesmenRes.data)
      setBranches(branchesRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load salesmen.')
    } finally {
      setLoading(false)
    }
  }, [request, search])

  useEffect(() => {
    if (status === 'authenticated') void loadData()
  }, [status, loadData])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (salesman: Salesman) => {
    setEditingId(salesman.id)
    setForm({
      name: salesman.name,
      email: salesman.email ?? '',
      mobile: salesman.mobile ?? '',
      password: '',
      status: salesman.status,
      branch_ids: (salesman.branches ?? []).map(b => b.id)
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    if (saving) return
    setDialogOpen(false)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }

    setSaving(true)
    setFormError(null)

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      mobile: form.mobile.trim() || null,
      status: form.status,
      branch_ids: form.branch_ids
    }

    if (form.password.trim()) {
      payload.password = form.password.trim()
    }

    try {
      if (editingId) {
        await request(`/salesmen/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        setSuccessMessage('Salesman updated successfully.')
      } else {
        await request('/salesmen', { method: 'POST', body: JSON.stringify(payload) })
        setSuccessMessage('Salesman created successfully.')
      }

      setDialogOpen(false)
      await loadData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save salesman.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    try {
      await request(`/salesmen/${deleteTarget.id}`, { method: 'DELETE' })
      setSuccessMessage(`${deleteTarget.name} was deleted successfully.`)
      setDeleteTarget(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete salesman.')
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }} display='flex' justifyContent='space-between' alignItems='center'>
        <Box>
          <Typography variant='h4' sx={{ mb: 1, fontWeight: 600 }}>Salesman Master</Typography>
          <Typography color='text.secondary'>Manage the salesmen/agents who can be assigned to subscriptions, scheme openings, and commissions.</Typography>
        </Box>
        <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={openCreate}>
          Add Salesman
        </Button>
      </Grid>

      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error'>{error}</Alert>
        </Grid>
      )}
      {successMessage && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='success' onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <TextField
              fullWidth
              label='Search salesmen'
              placeholder='Search by name, email, or mobile'
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='ri-search-line' />
                  </InputAdornment>
                )
              }}
            />
          </CardContent>
        </Card>
      </Grid>

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
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Mobile</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Branches</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell align='right' sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {salesmen.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography color='text.secondary' sx={{ p: 4, textAlign: 'center' }}>
                            No salesmen yet.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {salesmen.map(salesman => (
                      <TableRow key={salesman.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{salesman.name}</TableCell>
                        <TableCell>{salesman.mobile || '—'}</TableCell>
                        <TableCell>{salesman.email || '—'}</TableCell>
                        <TableCell>
                          {(salesman.branches ?? []).length
                            ? salesman.branches!.map(b => b.name).join(', ')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            label={salesman.status}
                            color={salesman.status === 'active' ? 'success' : 'default'}
                            variant='tonal'
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <IconButton size='small' component={Link} href={`/salesmen/${salesman.id}`}>
                            <i className='ri-eye-line' style={{ fontSize: '1.1rem' }} />
                          </IconButton>
                          <IconButton size='small' onClick={() => openEdit(salesman)}>
                            <i className='ri-edit-line' style={{ fontSize: '1.1rem' }} />
                          </IconButton>
                          <IconButton
                            size='small'
                            color='info'
                            component={Link}
                            href={`/commission/overrides?salesman_id=${salesman.id}`}
                            title='Commission Setup'
                          >
                            <i className='ri-percent-line' style={{ fontSize: '1.1rem' }} />
                          </IconButton>
                          <IconButton size='small' color='error' onClick={() => setDeleteTarget(salesman)}>
                            <i className='ri-delete-bin-line' style={{ fontSize: '1.1rem' }} />
                          </IconButton>
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
        <DialogTitle>{editingId ? 'Edit Salesman' : 'Add Salesman'}</DialogTitle>
        <DialogContent>
          <Stack spacing={4} sx={{ mt: 1 }}>
            {formError && <Alert severity='error'>{formError}</Alert>}

            <TextField
              fullWidth
              label='Name'
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <Stack direction='row' spacing={3}>
              <TextField
                fullWidth
                label='Mobile'
                value={form.mobile}
                onChange={e => setForm({ ...form, mobile: e.target.value })}
              />
              <TextField
                fullWidth
                label='Email'
                helperText='Leave blank to auto-generate'
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </Stack>
            <TextField
              fullWidth
              type='password'
              label='Password'
              helperText={editingId ? 'Leave blank to keep current password' : 'Leave blank to auto-generate'}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
            <TextField
              select
              fullWidth
              label='Branches'
              value={form.branch_ids}
              onChange={e => setForm({ ...form, branch_ids: e.target.value as unknown as number[] })}
              SelectProps={{
                multiple: true,
                renderValue: (selected: unknown) =>
                  branches
                    .filter(b => (selected as number[]).includes(b.id))
                    .map(b => b.name)
                    .join(', ')
              }}
            >
              {branches.map(b => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label='Status'
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
            >
              <MenuItem value='active'>Active</MenuItem>
              <MenuItem value='inactive'>Inactive</MenuItem>
              <MenuItem value='blocked'>Blocked</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button variant='contained' onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth='xs' fullWidth>
        <DialogContent sx={{ pt: 6, textAlign: 'center' }}>
          <Box sx={{ mb: 3, color: 'warning.main', fontSize: 72 }}>
            <i className='ri-error-warning-line' />
          </Box>
          <Typography variant='h4' sx={{ mb: 1.5 }}>Delete salesman?</Typography>
          <Typography color='text.secondary'>
            {deleteTarget ? `${deleteTarget.name} will be permanently removed.` : ''}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 5, px: 4 }}>
          <Button variant='contained' color='error' onClick={() => void confirmDelete()}>Delete</Button>
          <Button variant='outlined' color='secondary' onClick={() => setDeleteTarget(null)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default SalesmanListPage
