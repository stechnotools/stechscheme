'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

type ChartOfAccount = {
  id: number
  name: string
  code?: string | null
  account_type: string
  parent_id?: number | null
  is_active: boolean
  source_type?: string | null
  remarks?: string | null
  parent?: {
    id: number
    name: string
  } | null
}

type ChartOfAccountsResponse = {
  data: ChartOfAccount[]
}

type ChartOfAccountFormState = {
  parent_id: string
  name: string
  code: string
  account_type: string
  remarks: string
  is_active: boolean
}

const accountTypeOptions = ['Asset', 'Liability', 'Income', 'Expense', 'Equity'] as const

const initialFormState: ChartOfAccountFormState = {
  parent_id: '',
  name: '',
  code: '',
  account_type: 'Asset',
  remarks: '',
  is_active: true
}

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const getSourceLabel = (sourceType?: string | null) => (sourceType === 'scheme' ? 'Auto from Scheme' : 'Manual')

const ChartOfAccountsPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [form, setForm] = useState<ChartOfAccountFormState>(initialFormState)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [accountTypeFilter, setAccountTypeFilter] = useState('all')
  const [openNodes, setOpenNodes] = useState<Record<number, boolean>>({})
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null)

  const editingAccount = useMemo(() => {
    if (!editingAccountId) return null
    return accounts.find(item => item.id === editingAccountId) ?? null
  }, [accounts, editingAccountId])
  const isEditing = Boolean(editingAccountId)

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!accessToken) {
        throw new Error('Missing access token')
      }

      const response = await fetch(`${backendApiUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...(init?.headers || {})
        }
      })

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; errors?: Record<string, string[]> }
        | null

      if (!response.ok) {
        const validationMessage = payload?.errors
          ? Object.values(payload.errors)
              .flat()
              .join(' ')
          : null

        throw new Error(validationMessage || payload?.message || 'Request failed')
      }

      return payload as T
    },
    [accessToken]
  )

  const resetForm = useCallback(() => {
    setForm({
      ...initialFormState,
      parent_id: ''
    })
    setEditingAccountId(null)
  }, [])

  const loadData = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      const accountsResponse = await request<ChartOfAccountsResponse>('/chart-of-accounts?per_page=300&sort_by=created_at&sort_direction=desc')
      setAccounts(accountsResponse.data)
      setForm(prev => ({
        ...prev,
        parent_id: prev.parent_id || ''
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart of accounts.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, request])

  useEffect(() => {
    if (status === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')
      return
    }

    if (status === 'authenticated') {
      void loadData()
    }
  }, [status, accessToken, loadData])

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return accounts.filter(account => {
      const matchesType = accountTypeFilter === 'all' || account.account_type === accountTypeFilter
      const matchesSearch =
        !query ||
        account.name.toLowerCase().includes(query) ||
        account.code?.toLowerCase().includes(query) ||
        account.account_type.toLowerCase().includes(query) ||
        account.parent?.name?.toLowerCase().includes(query) ||
        getSourceLabel(account.source_type).toLowerCase().includes(query) ||
        account.remarks?.toLowerCase().includes(query)

      return matchesType && matchesSearch
    })
  }, [accountTypeFilter, accounts, search])

  const flatAccounts = useMemo(() => {
    return [...filteredAccounts].sort((left, right) => left.name.localeCompare(right.name))
  }, [filteredAccounts])

  const childrenMap = useMemo(() => {
    const map = new Map<number | null, ChartOfAccount[]>()

    flatAccounts.forEach(account => {
      const key = (account.parent_id ?? null) as number | null
      const list = map.get(key) ?? []
      list.push(account)
      map.set(key, list)
    })

    for (const list of map.values()) {
      list.sort((left, right) => {
        const typeCompare = left.account_type.localeCompare(right.account_type)
        if (typeCompare !== 0) return typeCompare
        return left.name.localeCompare(right.name)
      })
    }

    return map
  }, [flatAccounts])

  const blockedParentIds = useMemo(() => {
    if (!editingAccountId) return new Set<number>()

    const blocked = new Set<number>()
    const walk = (id: number) => {
      if (blocked.has(id)) return
      blocked.add(id)
      ;(childrenMap.get(id) ?? []).forEach(child => walk(child.id))
    }

    walk(editingAccountId)
    return blocked
  }, [childrenMap, editingAccountId])

  const totals = useMemo(() => {
    const manualCount = filteredAccounts.filter(item => item.source_type !== 'scheme').length
    const schemeCount = filteredAccounts.filter(item => item.source_type === 'scheme').length
    const activeCount = filteredAccounts.filter(item => item.is_active).length

    return {
      total: filteredAccounts.length,
      manual: manualCount,
      scheme: schemeCount,
      active: activeCount
    }
  }, [filteredAccounts])

  const setAccountType = (accountType: string) => {
    setForm(prev => ({
      ...prev,
      account_type: accountType
    }))
  }

  const toggleNode = (accountId: number) => {
    setOpenNodes(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }))
  }

  const startEdit = (account: ChartOfAccount) => {
    if (account.source_type === 'scheme') {
      setError('This account is managed by the Scheme module and cannot be edited here.')
      return
    }

    setEditingAccountId(account.id)
    setError(null)
    setSuccess(null)
    setForm({
      parent_id: account.parent_id ? String(account.parent_id) : '',
      name: account.name ?? '',
      code: account.code ?? '',
      account_type: account.account_type ?? 'Asset',
      remarks: account.remarks ?? '',
      is_active: Boolean(account.is_active)
    })
  }

  const handleDelete = async (account: ChartOfAccount) => {
    if (account.source_type === 'scheme') {
      setError('This account is managed by the Scheme module and cannot be deleted here.')
      return
    }

    const childCount = (childrenMap.get(account.id) ?? []).length
    const message = childCount
      ? `Delete "${account.name}"? It has ${childCount} child account(s). They will become root-level accounts.`
      : `Delete "${account.name}"?`

    if (!confirm(message)) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await request(`/chart-of-accounts/${account.id}`, { method: 'DELETE' })
      setSuccess('Account deleted successfully.')

      if (editingAccountId === account.id) {
        resetForm()
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.account_type.trim()) {
      setError('Account name and account type are required.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const path = isEditing ? `/chart-of-accounts/${editingAccountId}` : '/chart-of-accounts'
      const method = isEditing ? 'PUT' : 'POST'

      await request(path, {
        method,
        body: JSON.stringify({
          parent_id: form.parent_id ? Number(form.parent_id) : null,
          name: form.name.trim(),
          code: form.code.trim() || null,
          account_type: form.account_type,
          remarks: form.remarks.trim() || null,
          is_active: form.is_active,
          source_type: 'manual'
        })
      })

      setSuccess(isEditing ? 'Account updated successfully.' : 'Account created successfully.')
      resetForm()
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save chart of account.')
    } finally {
      setSaving(false)
    }
  }

  const renderTreeNode = (account: ChartOfAccount, level: number): React.ReactNode => {
    const children = childrenMap.get(account.id) ?? []
    const hasChildren = children.length > 0
    const isOpen = Boolean(openNodes[account.id])
    const typeIconClass = hasChildren ? (isOpen ? 'ri-folder-open-line' : 'ri-folder-3-line') : 'ri-file-list-3-line'
    const isSchemeManaged = account.source_type === 'scheme'

    return (
      <Box key={account.id} sx={{ pl: level ? level * 2.5 : 0 }}>
        <Box
          sx={{
            py: 1.75,
            px: 2,
            borderRadius: 1,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 1.5,
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            '&:hover': {
              bgcolor: theme => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)')
            }
          }}
        >
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
              {hasChildren ? (
                <Button
                  size='small'
                  color='secondary'
                  variant='text'
                  onClick={() => toggleNode(account.id)}
                  sx={{ minWidth: 28, px: 0.5, py: 0 }}
                >
                  <i className={isOpen ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} />
                </Button>
              ) : (
                <Box sx={{ width: 28 }} />
              )}
              <Box sx={{ width: 22, display: 'flex', justifyContent: 'center', color: 'text.secondary' }}>
                <i className={typeIconClass} />
              </Box>
              <Typography fontWeight={700} sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {account.name}
              </Typography>
              <Chip label={account.code || 'No code'} size='small' variant='outlined' />
            </Stack>
            <Typography variant='body2' color='text.secondary' sx={{ pl: 4 }}>
              {account.remarks || 'No remarks'}
            </Typography>
          </Stack>

          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            <Chip label={account.account_type} size='small' variant='tonal' color='primary' />
            <Chip label={getSourceLabel(account.source_type)} size='small' variant='outlined' color={account.source_type === 'scheme' ? 'info' : 'default'} />
            <Chip label={account.is_active ? 'Active' : 'Inactive'} size='small' variant='tonal' color={account.is_active ? 'success' : 'default'} />
            <Tooltip title={isSchemeManaged ? 'Managed by Scheme' : 'Edit'}>
              <span>
                <IconButton size='small' disabled={isSchemeManaged || saving} onClick={() => startEdit(account)}>
                  <i className='ri-edit-2-line' />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={isSchemeManaged ? 'Managed by Scheme' : 'Delete'}>
              <span>
                <IconButton size='small' color='error' disabled={isSchemeManaged || saving} onClick={() => void handleDelete(account)}>
                  <i className='ri-delete-bin-6-line' />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>

        {hasChildren ? (
          <Box sx={{ mt: 0.5, display: isOpen ? 'block' : 'none' }}>
            <Stack spacing={0.75}>{children.map(child => renderTreeNode(child, level + 1))}</Stack>
          </Box>
        ) : null}
      </Box>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(135deg, rgba(7,20,34,1) 0%, rgba(13,60,89,1) 38%, rgba(20,128,61,1) 100%)',
            color: 'common.white'
          }}
        >
          <CardContent sx={{ p: { xs: 4, md: 6 } }}>
            <Box
              sx={{
                position: 'absolute',
                insetInlineEnd: { xs: -80, md: -40 },
                insetBlockStart: -70,
                width: 260,
                height: 260,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)'
              }}
            />
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={3}
              justifyContent='space-between'
              alignItems={{ xs: 'flex-start', lg: 'center' }}
              sx={{ position: 'relative', zIndex: 1 }}
            >
              <div>
                <Typography variant='h4' sx={{ color: 'common.white', mb: 1 }}>
                  Charts of Account
                </Typography>
                <Typography sx={{ maxWidth: 760, color: 'rgba(255,255,255,0.82)' }}>
                  Browse the full account master with global and sub account types, with scheme liabilities flowing in
                  automatically under Scheme Collection.
                </Typography>
              </div>
              <Chip
                label={`${totals.total} total accounts`}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.14)',
                  color: 'common.white',
                  '& .MuiChip-label': { fontWeight: 700 }
                }}
              />
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {error ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error'>{error}</Alert>
        </Grid>
      ) : null}

      {success ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='success'>{success}</Alert>
        </Grid>
      ) : null}

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Stack
                direction='row'
                spacing={2}
                alignItems='center'
                sx={{
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  pb: 0.5,
                  '&::-webkit-scrollbar': { height: 6 }
                }}
              >
                <TextField
                  sx={{ flex: '1 1 420px', minWidth: 260 }}
                  label='Search accounts'
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder='Search by name, code, type, parent, source, or remarks'
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
                  label='Global type'
                  value={accountTypeFilter}
                  onChange={event => setAccountTypeFilter(event.target.value)}
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value='all'>All types</MenuItem>
                  {accountTypeOptions.map(type => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
                <Button variant='outlined' color='secondary' onClick={() => void loadData()} disabled={loading}>
                  {loading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <div>
                <Typography variant='h5'>{isEditing ? 'Edit Account' : 'Create Account'}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {isEditing ? 'Update the selected ledger head details.' : 'Create a new ledger head and optionally attach it under a parent account.'}
                </Typography>
              </div>

              <TextField
                select
                fullWidth
                label='Parent Account'
                value={form.parent_id}
                onChange={event => setForm(prev => ({ ...prev, parent_id: event.target.value }))}
                helperText='Optional. Keep empty to create a root-level account.'
              >
                <MenuItem value=''>None (Root)</MenuItem>
                {accounts
                  .filter(item => (isEditing ? !blockedParentIds.has(item.id) : true))
                  .sort((left, right) => left.name.localeCompare(right.name))
                  .map(item => (
                    <MenuItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </MenuItem>
                  ))}
              </TextField>

              <TextField
                fullWidth
                label='Account Name'
                value={form.name}
                onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
              />

              <TextField
                fullWidth
                label='Account Code'
                value={form.code}
                onChange={event => setForm(prev => ({ ...prev, code: event.target.value.toUpperCase() }))}
              />

              <TextField
                select
                fullWidth
                label='Global Account Type'
                value={form.account_type}
                onChange={event => setAccountType(event.target.value)}
              >
                {accountTypeOptions.map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                multiline
                minRows={3}
                label='Remarks'
                value={form.remarks}
                onChange={event => setForm(prev => ({ ...prev, remarks: event.target.value }))}
              />

              <FormControlLabel
                control={<Switch checked={form.is_active} onChange={event => setForm(prev => ({ ...prev, is_active: event.target.checked }))} />}
                label='Active account'
              />

              <Stack direction='row' spacing={2} justifyContent='flex-end'>
                <Button variant='outlined' color='secondary' onClick={resetForm} disabled={saving}>
                  {isEditing ? 'Cancel' : 'Reset'}
                </Button>
                {isEditing ? (
                  <Button
                    variant='outlined'
                    color='error'
                    onClick={() => (editingAccount ? void handleDelete(editingAccount) : undefined)}
                    disabled={saving || !editingAccount}
                  >
                    Delete
                  </Button>
                ) : null}
                <Button variant='contained' onClick={() => void handleSubmit()} disabled={saving || loading}>
                  {saving ? 'Saving...' : isEditing ? 'Update Account' : 'Create Account'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Card
          sx={{
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Stack spacing={0}>
              <Box sx={{ px: { xs: 3, md: 4 }, py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={1.5}>
                  <div>
                    <Typography variant='h5'>Chart of Accounts</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Parent-child account tree (filtered by search and global type).
                    </Typography>
                  </div>
                  <Chip label={loading ? 'Syncing with backend' : 'Live backend data'} color={loading ? 'warning' : 'success'} variant='tonal' />
                </Stack>
              </Box>

              {!flatAccounts.length ? (
                <Box sx={{ px: 4, py: 8, textAlign: 'center' }}>
                  <Typography variant='h6' sx={{ mb: 1 }}>
                    No accounts found
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Try changing your filters or create a new chart of account from the left panel.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5 }}>
                  <Stack spacing={1}>
                    {(childrenMap.get(null) ?? []).map(root => renderTreeNode(root, 0))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default ChartOfAccountsPage
