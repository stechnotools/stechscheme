'use client'

import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { customerPortalRequest } from '@/libs/customerPortal'
import { listQueuedPaymentRequests, queuePaymentRequest, removeQueuedPaymentRequest } from '@/libs/offlinePaymentQueue'

type Installment = { id: number; installment_no: number; due_date: string; amount: string | number; paid: boolean }
type Membership = { id: number; scheme?: { name: string } | null; installments?: Installment[] }

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

const CustomerPortalPayPage = () => {
  const [memberships, setMemberships] = useState<Membership[] | null>(null)
  const [selected, setSelected] = useState<Record<number, number[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [paying, setPaying] = useState<number | null>(null)
  const [queuedCount, setQueuedCount] = useState(0)

  const retryQueued = async () => {
    const queued = await listQueuedPaymentRequests()
    setQueuedCount(queued.length)

    if (!navigator.onLine || queued.length === 0) return

    for (const item of queued) {
      try {
        const response = await customerPortalRequest<{ data: { redirect_url: string } }>('/customer-portal/payments/initiate', {
          method: 'POST',
          body: JSON.stringify({ membership_id: item.membershipId, installment_ids: item.installmentIds })
        })
        await removeQueuedPaymentRequest(item.id)
        window.location.href = response.data.redirect_url
        return
      } catch {
        // Still failing — leave it queued, try again on the next online event.
      }
    }

    setQueuedCount((await listQueuedPaymentRequests()).length)
  }

  useEffect(() => {
    const load = async () => {
      try {
        const response = await customerPortalRequest<{ data: Membership[] }>('/customer-portal/memberships')
        setMemberships(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load memberships.')
      }
    }

    void load()
    void retryQueued()

    window.addEventListener('online', retryQueued)
    return () => window.removeEventListener('online', retryQueued)
  }, [])

  const toggleInstallment = (membershipId: number, installmentId: number) => {
    setSelected(prev => {
      const current = prev[membershipId] || []
      const next = current.includes(installmentId) ? current.filter(id => id !== installmentId) : [...current, installmentId]

      return { ...prev, [membershipId]: next }
    })
  }

  const handlePay = async (membership: Membership) => {
    const installmentIds = selected[membership.id] || []
    if (installmentIds.length === 0) {
      setError('Please select at least one installment to pay.')
      return
    }

    setPaying(membership.id)
    setError(null)
    setInfo(null)

    try {
      const response = await customerPortalRequest<{ data: { redirect_url: string } }>('/customer-portal/payments/initiate', {
        method: 'POST',
        body: JSON.stringify({ membership_id: membership.id, installment_ids: installmentIds })
      })
      window.location.href = response.data.redirect_url
    } catch (err) {
      if (!navigator.onLine) {
        await queuePaymentRequest(membership.id, installmentIds)
        setQueuedCount(prev => prev + 1)
        setInfo('You appear to be offline — this payment will start automatically once you reconnect.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to start payment.')
      }
    } finally {
      setPaying(null)
    }
  }

  if (!memberships) {
    return (
      <Box sx={{ p: 4 }}>
        {error ? <Alert severity='error'>{error}</Alert> : <Stack alignItems='center' sx={{ mt: 6 }}><CircularProgress /></Stack>}
      </Box>
    )
  }

  const membershipsWithDue = memberships.filter(m => (m.installments || []).some(i => !i.paid))

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        {queuedCount > 0 ? (
          <Alert severity='warning'>
            {queuedCount} payment{queuedCount > 1 ? 's are' : ' is'} queued and will start automatically once you&apos;re back online.
          </Alert>
        ) : null}
        {error ? <Alert severity='error'>{error}</Alert> : null}
        {info ? <Alert severity='info'>{info}</Alert> : null}

        {membershipsWithDue.length === 0 ? (
          <Alert severity='success'>You have no pending installments right now.</Alert>
        ) : (
          membershipsWithDue.map(membership => {
            const unpaid = (membership.installments || []).filter(i => !i.paid)
            const selectedIds = selected[membership.id] || []
            const total = unpaid.filter(i => selectedIds.includes(i.id)).reduce((sum, i) => sum + Number(i.amount || 0), 0)

            return (
              <Card key={membership.id}>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant='h6'>{membership.scheme?.name || `Membership #${membership.id}`}</Typography>
                    <Stack spacing={1}>
                      {unpaid.map(installment => (
                        <Stack key={installment.id} direction='row' alignItems='center' spacing={1} sx={{ p: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
                          <Checkbox
                            checked={selectedIds.includes(installment.id)}
                            onChange={() => toggleInstallment(membership.id, installment.id)}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography fontWeight={700}>Installment {installment.installment_no}</Typography>
                            <Typography variant='caption' color='text.secondary'>
                              Due {new Date(installment.due_date).toLocaleDateString('en-IN')}
                            </Typography>
                          </Box>
                          <Typography fontWeight={700}>{currencyFormatter.format(Number(installment.amount || 0))}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                    <Stack direction='row' justifyContent='space-between' alignItems='center'>
                      <Typography variant='h6'>Total: {currencyFormatter.format(total)}</Typography>
                      <Button
                        variant='contained'
                        color='warning'
                        size='large'
                        disabled={paying === membership.id || selectedIds.length === 0}
                        onClick={() => void handlePay(membership)}
                      >
                        {paying === membership.id ? 'Starting...' : 'Pay Now'}
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            )
          })
        )}
      </Stack>
    </Box>
  )
}

export default CustomerPortalPayPage
