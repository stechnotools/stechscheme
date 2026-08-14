'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { getCustomerName, resolveBackendApiUrl, type Customer } from '../customerData'

type DuplicateGroup = {
  name: string
  customers: Customer[]
}

const normalizeName = (value?: string | null) => value?.trim().replace(/\s+/g, ' ').toLowerCase() || ''
const getGroupLabel = (group: DuplicateGroup) => group.customers[0]?.name?.trim() || 'Unnamed'

const MergeDuplicateCustomerPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [search, setSearch] = useState('')
  const [allGroups, setAllGroups] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [merging, setMerging] = useState(false)

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!accessToken) {
        throw new Error('Missing access token')
      }

      const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...(init?.headers || {})
        }
      })

      const payload = (await response.json().catch(() => null)) as { message?: string; errors?: Record<string, string[]> } | null

      if (!response.ok) {
        const validationMessage = payload?.errors ? Object.values(payload.errors).flat().join(' ') : null
        throw new Error(validationMessage || payload?.message || 'Request failed')
      }

      return payload as T
    },
    [accessToken]
  )

  const loadAllDuplicateGroups = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      const allCustomers: Customer[] = []
      let page = 1
      let lastPage = 1

      do {
        const response = await request<{ data: Customer[]; last_page?: number }>(`/customers?page=${page}&per_page=100`)
        allCustomers.push(...(response.data || []))
        lastPage = response.last_page || page
        page += 1
      } while (page <= lastPage)

      const grouped = new Map<string, Customer[]>()

      for (const customer of allCustomers) {
        const key = normalizeName(customer.name)
        if (!key) continue

        const current = grouped.get(key) || []
        current.push(customer)
        grouped.set(key, current)
      }

      const duplicateGroups = Array.from(grouped.entries())
        .map(([name, customers]) => ({
          name,
          customers: Array.from(new Map(customers.map(customer => [customer.mobile || String(customer.id), customer])).values())
        }))
        .filter(group => group.customers.length > 1)
        .filter(group => new Set(group.customers.map(customer => customer.mobile)).size > 1)
        .sort((left, right) => getGroupLabel(left).localeCompare(getGroupLabel(right)))

      setAllGroups(duplicateGroups)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load duplicate customers.')
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
      void loadAllDuplicateGroups()
    }
  }, [status, accessToken, loadAllDuplicateGroups])

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return allGroups

    return allGroups.filter(group => group.name.includes(query))
  }, [allGroups, search])

  const toggleGroupSelection = (groupName: string) => {
    setSelectedGroups(prev => {
      const next = new Set(prev)

      if (next.has(groupName)) next.delete(groupName)
      else next.add(groupName)

      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedGroups(prev =>
      prev.size === filteredGroups.length ? new Set() : new Set(filteredGroups.map(group => group.name))
    )
  }

  // Merges one group (lowest customer ID wins as the primary record) and
  // returns a per-group outcome instead of touching page-level error/success
  // state directly, so the caller can merge many groups and report one
  // combined summary at the end.
  const mergeOneGroup = async (group: DuplicateGroup): Promise<{ label: string; error?: string }> => {
    const sorted = [...group.customers].sort((left, right) => left.id - right.id)
    const primary = sorted[0]
    const duplicates = sorted.slice(1)
    const label = getGroupLabel(group)

    if (!primary || duplicates.length === 0) {
      return { label, error: 'Not enough records to merge.' }
    }

    try {
      for (const duplicate of duplicates) {
        await request(`/customers/${primary.id}/merge`, {
          method: 'POST',
          body: JSON.stringify({ duplicate_customer_id: duplicate.id })
        })
      }

      return { label }
    } catch (err) {
      return { label, error: err instanceof Error ? err.message : 'Merge failed.' }
    }
  }

  const handleMergeSelected = async () => {
    const groups = filteredGroups.filter(group => selectedGroups.has(group.name))

    if (groups.length === 0) return

    setMerging(true)
    setError(null)
    setSuccess(null)

    const failures: string[] = []
    let mergedCount = 0

    for (const group of groups) {
      const result = await mergeOneGroup(group)

      if (result.error) failures.push(`${result.label}: ${result.error}`)
      else mergedCount += 1
    }

    setSelectedGroups(new Set())
    await loadAllDuplicateGroups()
    setMerging(false)

    if (mergedCount > 0) {
      setSuccess(`Merged ${mergedCount} group(s) successfully.`)
    }

    if (failures.length > 0) {
      setError(`Failed to merge: ${failures.join('; ')}`)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card sx={{ overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #0f766e 100%)', color: 'common.white' }}>
          <CardContent sx={{ p: { xs: 4, md: 6 } }}>
            <Stack spacing={2}>
              <Chip label='Manual Duplicate Review' sx={{ alignSelf: 'flex-start', bgcolor: 'rgba(255,255,255,0.14)', color: 'common.white' }} />
              <Typography variant='h3' sx={{ color: 'common.white' }}>
                Same-name duplicate customers
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.8)', maxWidth: 820 }}>
                All duplicate-name groups appear on this page, one after another. Review each group manually, compare the mobile numbers, and merge only when you are sure the records are duplicates.
              </Typography>
              <Button component={Link} href='/customers' variant='outlined' sx={{ alignSelf: 'flex-start', color: 'common.white', borderColor: 'rgba(255,255,255,0.28)' }}>
                Back to Customers
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant='h6' fontWeight={700}>Filter groups</Typography>
              <TextField
                fullWidth
                label='Filter by name'
                placeholder='Type a name to narrow the duplicate groups'
                value={search}
                onChange={e => setSearch(e.target.value)}
                helperText='The page loads all same-name duplicates by default.'
              />
              {error ? <Alert severity='error'>{error}</Alert> : null}
              {success ? <Alert severity='success'>{success}</Alert> : null}
              {loading ? (
                <Stack alignItems='center' sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </Stack>
              ) : filteredGroups.length === 0 ? (
                <Alert severity='info'>No duplicate names found.</Alert>
              ) : (
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
                  <Stack direction='row' spacing={2} alignItems='center'>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={filteredGroups.length > 0 && selectedGroups.size === filteredGroups.length}
                          indeterminate={selectedGroups.size > 0 && selectedGroups.size < filteredGroups.length}
                          onChange={toggleSelectAll}
                        />
                      }
                      label='Select all'
                    />
                    <Typography variant='body2' color='text.secondary'>
                      Showing {filteredGroups.length} duplicate name group(s)
                    </Typography>
                  </Stack>
                  <Button
                    variant='contained'
                    color='warning'
                    onClick={() => void handleMergeSelected()}
                    disabled={selectedGroups.size === 0 || merging}
                    startIcon={merging ? <CircularProgress size={16} color='inherit' /> : undefined}
                  >
                    {merging ? 'Merging...' : `Merge Selected (${selectedGroups.size})`}
                  </Button>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {filteredGroups.map(group => {
        const primary = [...group.customers].sort((left, right) => left.id - right.id)[0]

        return (
          <Grid key={group.name} size={{ xs: 12 }}>
              <Card variant='outlined' sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' spacing={1}>
                    <Stack direction='row' spacing={2} alignItems='center'>
                      <Checkbox
                        checked={selectedGroups.has(group.name)}
                        onChange={() => toggleGroupSelection(group.name)}
                        disabled={merging}
                      />
                      <Box>
                        <Typography variant='h6' fontWeight={700}>{getGroupLabel(group)}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {group.customers.length} records with the same name
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip label={`${group.customers.length} records`} color='primary' variant='outlined' sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }} />
                  </Stack>

                  <Stack spacing={2}>
                    {group.customers
                      .slice()
                      .sort((left, right) => left.id - right.id)
                      .map(customer => (
                        <Card key={customer.id} variant='outlined'>
                          <CardContent>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                              <Avatar sx={{ width: 42, height: 42 }}>
                                {getCustomerName(customer).charAt(0).toUpperCase()}
                              </Avatar>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography fontWeight={700}>{getCustomerName(customer)}</Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  Mobile: {customer.mobile}
                                  {customer.alternate_mobile ? ` | Alt: ${customer.alternate_mobile}` : ''}
                                </Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  Card: {customer.loyalty_card_no || 'Not assigned'}
                                </Typography>
                              </Box>
                              {primary?.id === customer.id ? <Chip label='Primary record' color='primary' size='small' /> : null}
                              <Button component={Link} href={`/customers/${customer.id}`} variant='outlined' size='small'>
                                View
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                  </Stack>
                  <Typography variant='body2' color='text.secondary'>
                    The app will keep the lowest customer ID as the main record and merge the others into it.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )
      })}
    </Grid>
  )
}

export default MergeDuplicateCustomerPage
