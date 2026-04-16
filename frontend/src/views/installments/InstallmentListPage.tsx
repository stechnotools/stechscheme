'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

type InstallmentItem = {
  id: number
  installment_no: number
  due_date: string
  amount: string | number
  paid: boolean
  membership?: {
    id: number
    customer?: { name?: string | null; mobile: string } | null
    scheme?: { name: string; code: string } | null
  } | null
}

type InstallmentsResponse = { data: InstallmentItem[] }

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const InstallmentListPage = ({ title, query }: { title: string; query: string }) => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const [rows, setRows] = useState<InstallmentItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(async <T,>(path: string): Promise<T> => {
    if (!accessToken) throw new Error('Missing access token')
    const response = await fetch(`${resolveBackendApiUrl()}${path}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` } })
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    if (!response.ok) throw new Error(payload?.message || 'Request failed')
    return payload as T
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    const load = async () => {
      try {
        const response = await request<InstallmentsResponse>(`/installments?per_page=200&${query}`)
        setRows(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load installments.')
      }
    }
    void load()
  }, [accessToken, query, request])

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <div>
                <Typography variant='h4'>{title}</Typography>
                <Typography color='text.secondary'>Track installment due dates, status, and linked memberships.</Typography>
              </div>
              {error ? <Alert severity='error'>{error}</Alert> : null}
              <Grid container spacing={3}>
                {rows.map(item => (
                  <Grid key={item.id} size={{ xs: 12, md: 6, xl: 4 }}>
                    <Card variant='outlined'>
                      <CardContent>
                        <Stack spacing={1.5}>
                          <Stack direction='row' justifyContent='space-between'>
                            <Typography fontWeight={700}>{`Installment #${item.installment_no}`}</Typography>
                            <Chip size='small' label={item.paid ? 'Paid' : 'Pending'} color={item.paid ? 'success' : 'warning'} />
                          </Stack>
                          <Typography color='text.secondary'>{item.membership?.customer?.name || item.membership?.customer?.mobile || 'Unknown customer'}</Typography>
                          <Typography color='text.secondary'>{item.membership?.scheme?.name || 'No scheme'}</Typography>
                          <Typography color='text.secondary'>{new Date(item.due_date).toLocaleDateString('en-IN')}</Typography>
                          <Typography>{`₹${Number(item.amount || 0).toLocaleString('en-IN')}`}</Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {!rows.length ? <Grid size={{ xs: 12 }}><Alert severity='info'>No installments found.</Alert></Grid> : null}
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default InstallmentListPage
