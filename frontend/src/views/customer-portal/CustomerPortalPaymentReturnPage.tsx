'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { customerPortalRequest } from '@/libs/customerPortal'

type PaymentStatus = 'initiated' | 'success' | 'failed' | 'expired'

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 20

const CustomerPortalPaymentReturnPage = () => {
  const searchParams = useSearchParams()
  const merchantOrderId = searchParams.get('merchant_order_id')
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollCount = useRef(0)

  useEffect(() => {
    if (!merchantOrderId) {
      setError('Missing payment reference.')
      return
    }

    let cancelled = false

    const poll = async () => {
      try {
        const response = await customerPortalRequest<{ data: { status: PaymentStatus } }>(
          `/customer-portal/payments/${merchantOrderId}/status`
        )
        if (cancelled) return

        setStatus(response.data.status)

        if (response.data.status === 'initiated' && pollCount.current < MAX_POLLS) {
          pollCount.current += 1
          setTimeout(poll, POLL_INTERVAL_MS)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to check payment status.')
      }
    }

    void poll()

    return () => {
      cancelled = true
    }
  }, [merchantOrderId])

  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
      <Stack spacing={3} alignItems='center' sx={{ maxWidth: 400, textAlign: 'center' }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}

        {status === null && !error ? (
          <>
            <CircularProgress />
            <Typography>Confirming your payment...</Typography>
          </>
        ) : null}

        {status === 'initiated' ? (
          <>
            <CircularProgress />
            <Typography>Still waiting for confirmation from PhonePe — this can take a few seconds.</Typography>
          </>
        ) : null}

        {status === 'success' ? (
          <>
            <i className='ri-checkbox-circle-fill' style={{ fontSize: '3rem', color: '#16a34a' }} />
            <Typography variant='h6'>Payment Successful</Typography>
            <Typography color='text.secondary'>Your installment has been recorded.</Typography>
          </>
        ) : null}

        {(status === 'failed' || status === 'expired') ? (
          <>
            <i className='ri-close-circle-fill' style={{ fontSize: '3rem', color: '#dc2626' }} />
            <Typography variant='h6'>Payment {status === 'expired' ? 'Expired' : 'Failed'}</Typography>
            <Typography color='text.secondary'>Please try again from the Pay screen.</Typography>
          </>
        ) : null}

        <Button component={Link} href='/customer/panel/pay' variant='contained'>
          Back to Pay
        </Button>
      </Stack>
    </Box>
  )
}

export default CustomerPortalPaymentReturnPage
