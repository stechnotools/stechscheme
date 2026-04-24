'use client'

import { useCallback, useEffect, useState } from 'react'

import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { SkeletonCard } from '@/components/SkeletonLoader'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(async <T,>(path: string): Promise<T> => {
    if (!accessToken) throw new Error('Missing access token')

    const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` }
    })

    const payload = (await response.json().catch(() => null)) as { message?: string } | null

    if (!response.ok) throw new Error(payload?.message || 'Request failed')

    return payload as T
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return

    const load = async () => {
      try {
        setError(null)
        setLoading(true)

        const response = await request<InstallmentsResponse>(`/installments?per_page=200&${query}`)

        setRows(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load installments.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [accessToken, query, request])

  const pendingCount = rows.filter(item => !item.paid).length
  const paidCount = rows.filter(item => item.paid).length
  const totalAmount = rows.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const latestDueDate = rows[0]?.due_date

  const summaryCards = [
    {
      label: 'Total Installments',
      value: rows.length.toLocaleString('en-IN'),
      note: 'Visible in the current board',
      icon: 'ri-stack-line',
      background: 'linear-gradient(135deg, rgba(28, 116, 255, 0.18), rgba(28, 116, 255, 0.05))'
    },
    {
      label: 'Pending Follow-up',
      value: pendingCount.toLocaleString('en-IN'),
      note: 'Collections still open',
      icon: 'ri-time-line',
      background: 'linear-gradient(135deg, rgba(255, 159, 67, 0.2), rgba(255, 159, 67, 0.06))'
    },
    {
      label: 'Paid Installments',
      value: paidCount.toLocaleString('en-IN'),
      note: 'Completed successfully',
      icon: 'ri-checkbox-circle-line',
      background: 'linear-gradient(135deg, rgba(40, 199, 111, 0.18), rgba(40, 199, 111, 0.05))'
    },
    {
      label: 'Collection Value',
      value: `Rs ${totalAmount.toLocaleString('en-IN')}`,
      note: latestDueDate ? `Next due in list: ${new Date(latestDueDate).toLocaleDateString('en-IN')}` : 'No due date available',
      icon: 'ri-money-rupee-circle-line',
      background: 'linear-gradient(135deg, rgba(115, 103, 240, 0.18), rgba(115, 103, 240, 0.05))'
    }
  ]

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            overflow: 'hidden',
            border: theme => `1px solid ${theme.palette.divider}`
          }}
        >
          <CardContent>
            <Stack spacing={3}>
              <Box
                sx={{
                  p: { xs: 2.5, md: 4 },
                  borderRadius: 4,
                  color: 'common.white',
                  background: 'linear-gradient(135deg, #13233d 0%, #1e4f8f 45%, #43a7b6 100%)'
                }}
              >
                <Grid container spacing={3} alignItems='center'>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <Stack spacing={1.5}>
                      <Typography variant='overline' sx={{ letterSpacing: '0.16em', opacity: 0.8 }}>
                        Collection Desk
                      </Typography>
                      <Typography variant='h4'>{title}</Typography>
                      <Typography sx={{ maxWidth: 760, color: 'rgba(255,255,255,0.82)' }}>
                        Review due dates, payment completion, and member-linked scheme activity from one focused installment board.
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(6px)'
                      }}
                    >
                      <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.72)' }}>
                        Live status
                      </Typography>
                      <Typography variant='h5' sx={{ mt: 0.5 }}>
                        {pendingCount ? `${pendingCount} pending collections` : 'All caught up'}
                      </Typography>
                      <Typography variant='body2' sx={{ mt: 1, color: 'rgba(255,255,255,0.72)' }}>
                        Focus the team on due items, overdue callbacks, and continuity across active memberships.
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              <Grid container spacing={3}>
                {summaryCards.map(card => (
                  <Grid key={card.label} size={{ xs: 12, sm: 6, xl: 3 }}>
                    <Card
                      variant='outlined'
                      sx={{
                        height: '100%',
                        borderRadius: 4,
                        background: card.background
                      }}
                    >
                      <CardContent>
                        <Stack spacing={1.5}>
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              display: 'grid',
                              placeItems: 'center',
                              borderRadius: 2.5,
                              backgroundColor: 'rgba(255,255,255,0.7)'
                            }}
                          >
                            <i className={card.icon} style={{ fontSize: 22 }} />
                          </Box>
                          <Typography color='text.secondary'>{card.label}</Typography>
                          <Typography variant='h4'>{card.value}</Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {card.note}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {error ? <Alert severity='error'>{error}</Alert> : null}

              {loading ? (
                <SkeletonCard count={6} />
              ) : (
                <Grid container spacing={3}>
                  {rows.map(item => (
                    <Grid key={item.id} size={{ xs: 12, md: 6, xl: 4 }}>
                      <Card
                        variant='outlined'
                        sx={{
                          height: '100%',
                          borderRadius: 4,
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: theme => theme.shadows[6]
                          }
                        }}
                      >
                        <CardContent>
                          <Stack spacing={2}>
                            <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={2}>
                              <Box>
                                <Typography variant='h6' fontWeight={700}>{`Installment #${item.installment_no}`}</Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  {item.membership?.scheme?.code || 'No scheme code'}
                                </Typography>
                              </Box>
                              <Chip
                                size='small'
                                label={item.paid ? 'Paid' : 'Pending'}
                                color={item.paid ? 'success' : 'warning'}
                                variant={item.paid ? 'filled' : 'tonal'}
                              />
                            </Stack>

                            <Box
                              sx={{
                                p: 2,
                                borderRadius: 3,
                                backgroundColor: theme => theme.palette.action.hover
                              }}
                            >
                              <Typography fontWeight={700}>
                                {item.membership?.customer?.name || item.membership?.customer?.mobile || 'Unknown customer'}
                              </Typography>
                              <Typography variant='body2' color='text.secondary'>
                                {item.membership?.customer?.mobile || 'Customer mobile unavailable'}
                              </Typography>
                            </Box>

                            <Divider />

                            <Grid container spacing={2}>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  Scheme
                                </Typography>
                                <Typography fontWeight={600}>{item.membership?.scheme?.name || 'No scheme'}</Typography>
                              </Grid>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  Due Date
                                </Typography>
                                <Typography fontWeight={600}>{new Date(item.due_date).toLocaleDateString('en-IN')}</Typography>
                              </Grid>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  Amount
                                </Typography>
                                <Typography fontWeight={700}>{`Rs ${Number(item.amount || 0).toLocaleString('en-IN')}`}</Typography>
                              </Grid>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  Membership
                                </Typography>
                                <Typography fontWeight={600}>{item.membership?.id ? `#${item.membership.id}` : 'Unlinked'}</Typography>
                              </Grid>
                            </Grid>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                  {!rows.length ? (
                    <Grid size={{ xs: 12 }}>
                      <Alert severity='info'>No installments found.</Alert>
                    </Grid>
                  ) : null}
                </Grid>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default InstallmentListPage
