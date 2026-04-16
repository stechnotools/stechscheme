'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

type MembershipItem = {
  id: number
  status: string
  start_date: string
  maturity_date: string
  total_paid: string | number
  customer?: { id: number; name?: string | null; mobile: string } | null
  scheme?: { id: number; name: string; code: string } | null
  installments?: Array<{ id: number; paid: boolean }>
  payments?: Array<{ id: number }>
}

type MembershipsResponse = { data: MembershipItem[] }

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

const MembershipListPage = ({ statusGroup, title }: { statusGroup: 'active' | 'matured' | 'redeemed' | 'closed'; title: string }) => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const [memberships, setMemberships] = useState<MembershipItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(async <T,>(path: string) => {
    if (!accessToken) throw new Error('Missing access token')
    const response = await fetch(`${resolveBackendApiUrl()}${path}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` } })
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    if (!response.ok) throw new Error(payload?.message || 'Request failed')
    return payload as T
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await request<MembershipsResponse>(`/memberships?per_page=200&status_group=${statusGroup}`)
        setMemberships(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load memberships.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [accessToken, request, statusGroup])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return memberships.filter(item => !q || (item.customer?.name || '').toLowerCase().includes(q) || (item.customer?.mobile || '').toLowerCase().includes(q) || (item.scheme?.name || '').toLowerCase().includes(q) || (item.scheme?.code || '').toLowerCase().includes(q))
  }, [memberships, search])

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
                <div>
                  <Typography variant='h4'>{title}</Typography>
                  <Typography color='text.secondary'>Track customer scheme enrollments with installment and payment summaries.</Typography>
                </div>
                <Button component={Link} href='/membership/create' variant='contained'>Create Membership</Button>
              </Stack>
              {error ? <Alert severity='error'>{error}</Alert> : null}
              <TextField label='Search membership' value={search} onChange={event => setSearch(event.target.value)} />
              {loading ? <Alert severity='info'>Loading memberships...</Alert> : null}
              <Grid container spacing={3}>
                {filtered.map(item => {
                  const paidInstallments = item.installments?.filter(installment => installment.paid).length || 0
                  const totalInstallments = item.installments?.length || 0
                  return (
                    <Grid key={item.id} size={{ xs: 12, md: 6 }}>
                      <Card variant='outlined'>
                        <CardContent>
                          <Stack spacing={2}>
                            <Stack direction='row' justifyContent='space-between' spacing={2}>
                              <div>
                                <Typography variant='h6'>{item.customer?.name || 'Unknown customer'}</Typography>
                                <Typography variant='body2' color='text.secondary'>{(item.scheme?.name || 'No scheme') + ` • ${item.scheme?.code || 'No code'}`}</Typography>
                              </div>
                              <Chip label={item.status} size='small' color='primary' variant='tonal' />
                            </Stack>
                            <Typography variant='body2' color='text.secondary'>{`Start ${new Date(item.start_date).toLocaleDateString('en-IN')} • Maturity ${new Date(item.maturity_date).toLocaleDateString('en-IN')}`}</Typography>
                            <Typography variant='body2' color='text.secondary'>{`Installments ${paidInstallments}/${totalInstallments} • Payments ${item.payments?.length || 0}`}</Typography>
                            <Typography fontWeight={700}>{currencyFormatter.format(Number(item.total_paid || 0))}</Typography>
                            <Stack direction='row' justifyContent='flex-end'>
                              <Button component={Link} href={`/membership/${item.id}`} variant='text'>View Details</Button>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
                {!loading && filtered.length === 0 ? <Grid size={{ xs: 12 }}><Alert severity='info'>No memberships found.</Alert></Grid> : null}
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default MembershipListPage
