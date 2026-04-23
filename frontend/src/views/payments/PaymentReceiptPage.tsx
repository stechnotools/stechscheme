'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

type PaymentReceipt = {
  id: number
  amount: string | number
  status: string
  payment_date: string
  gateway?: string | null
  transaction_id?: string | null
  membership?: {
    id: number
    customer?: {
      id?: number
      name?: string | null
      mobile: string
    } | null
    scheme?: {
      id?: number
      name: string
      code: string
    } | null
  } | null
  installment?: {
    id?: number
    installment_no: number
    amount?: string | number | null
    penalty?: string | number | null
  } | null
}

type PaymentReceiptResponse = {
  data: PaymentReceipt
}

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const getStatusColor = (status: string) => {
  if (status === 'success') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'refunded') return 'info'

  return 'error'
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const PaymentReceiptPage = ({ paymentId }: { paymentId: number }) => {
  const theme = useTheme()
  const searchParams = useSearchParams()
  const autoPrint = searchParams.get('autoprint') === '1'

  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [payment, setPayment] = useState<PaymentReceipt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const autoDownloadTriggeredRef = useRef(false)
  const receiptRef = useRef<HTMLDivElement | null>(null)

  const labelSx = { fontSize: '0.6875rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.04em', textTransform: 'uppercase' as const }

  const request = useCallback(async <T,>(path: string): Promise<T> => {
    if (!accessToken) throw new Error('Missing access token')

    const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    })

    const payload = (await response.json().catch(() => null)) as { message?: string } | null

    if (!response.ok) throw new Error(payload?.message || 'Request failed')

    return payload as T
  }, [accessToken])

  const handleDownloadPdf = useCallback(async () => {
    if (!receiptRef.current) return

    setDownloadingPdf(true)

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ])

      document.body.classList.add('pdf-capture')

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      })

      document.body.classList.remove('pdf-capture')

      const imageData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 10
      const printableWidth = pageWidth - margin * 2
      const printableHeight = pageHeight - margin * 2
      const imageHeight = (canvas.height * printableWidth) / canvas.width

      let remainingHeight = imageHeight
      let position = margin

      pdf.addImage(imageData, 'PNG', margin, position, printableWidth, imageHeight)
      remainingHeight -= printableHeight

      while (remainingHeight > 0) {
        position = margin - (imageHeight - remainingHeight)
        pdf.addPage()
        pdf.addImage(imageData, 'PNG', margin, position, printableWidth, imageHeight)
        remainingHeight -= printableHeight
      }

      pdf.save(`payment-receipt-${paymentId}.pdf`)
    } catch (err) {
      document.body.classList.remove('pdf-capture')
      setError(err instanceof Error ? err.message : 'Failed to download receipt PDF.')
    } finally {
      setDownloadingPdf(false)
    }
  }, [paymentId])

  useEffect(() => {
    if (!accessToken) return

    const loadReceipt = async () => {
      try {
        setError(null)
        const response = await request<PaymentReceiptResponse>(`/payments/${paymentId}`)

        setPayment(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load receipt.')
      }
    }

    void loadReceipt()
  }, [accessToken, paymentId, request])

  useEffect(() => {
    if (!payment || !autoPrint || autoDownloadTriggeredRef.current) return

    autoDownloadTriggeredRef.current = true

    const timeoutId = window.setTimeout(() => {
      void handleDownloadPdf()
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [autoPrint, handleDownloadPdf, payment])

  if (!payment) {
    return <Alert severity={error ? 'error' : 'info'}>{error || 'Loading receipt...'}</Alert>
  }

  const installmentBase = Number(payment.installment?.amount || 0)
  const installmentPenalty = Number(payment.installment?.penalty || 0)
  const totalPaid = Number(payment.amount || 0)
  const receiptDate = new Date(payment.payment_date).toLocaleDateString('en-IN')
  const customerName = payment.membership?.customer?.name || 'Unknown customer'
  const customerMobile = payment.membership?.customer?.mobile || '-'
  const schemeName = payment.membership?.scheme?.name || '-'
  const schemeCode = payment.membership?.scheme?.code || '-'
  const gatewayName = payment.gateway || 'manual'

  return (
    <Stack spacing={4}>
      <Stack direction='row' justifyContent='space-between' alignItems='center' className='no-print'>
        <Typography variant='h4'>Payment Receipt</Typography>
        <Stack direction='row' spacing={1.5}>
          <Button component={Link} href='/payments/history' variant='outlined' color='secondary'>
            Payment History
          </Button>
          <Button variant='outlined' onClick={() => window.print()}>Print</Button>
          <Button variant='contained' onClick={() => void handleDownloadPdf()} disabled={downloadingPdf}>
            {downloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
          </Button>
        </Stack>
      </Stack>

      <Box
        id='print-receipt'
        ref={receiptRef}
        sx={{
          maxWidth: '100%',
          mx: 'auto',
          p: 5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          '@media print': { border: 'none', p: 0 }
        }}
      >
        {/* Header */}
        <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
          <Stack spacing={0.5}>
            <Typography variant='h5' fontWeight={700}>RECEIPT</Typography>
            <Typography color='text.secondary'>Jewellery Scheme Collections</Typography>
          </Stack>
          <Stack spacing={0.5} alignItems='flex-end'>
            <Typography variant='body2' sx={labelSx}>Receipt No</Typography>
            <Typography fontWeight={600}>#{payment.id}</Typography>
            <Typography variant='body2' sx={labelSx}>Date</Typography>
            <Typography fontWeight={600}>{receiptDate}</Typography>
            <Chip label={payment.status} color={getStatusColor(payment.status)} size='small' sx={{ textTransform: 'capitalize', mt: 0.5 }} />
          </Stack>
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* Bill To / Scheme Info */}
        <Stack direction='row' justifyContent='space-between'>
          <Stack spacing={0.5}>
            <Typography sx={labelSx}>Bill To</Typography>
            <Typography fontWeight={600}>{customerName}</Typography>
            <Typography variant='body2' color='text.secondary'>{customerMobile}</Typography>
            <Typography variant='body2' color='text.secondary'>Membership #{payment.membership?.id || '-'}</Typography>
          </Stack>
          <Stack spacing={0.5} alignItems='flex-end'>
            <Typography sx={labelSx}>Scheme Details</Typography>
            <Typography fontWeight={600}>{schemeName}</Typography>
            <Typography variant='body2' color='text.secondary'>{schemeCode}</Typography>
            <Typography variant='body2' color='text.secondary'>Installment #{payment.installment?.installment_no || '-'}</Typography>
          </Stack>
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* Line Items Table */}
        <TableContainer>
          <Table size='small' sx={{ '& .MuiTableCell-root': { py: 1.5 } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.04) }}>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700 }}>Base</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700 }}>Penalty</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700 }}>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Typography fontWeight={600}>{schemeName} installment collection</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Membership #{payment.membership?.id || '-'} &middot; Installment #{payment.installment?.installment_no || '-'}
                  </Typography>
                </TableCell>
                <TableCell align='right'>{currencyFormatter.format(installmentBase)}</TableCell>
                <TableCell align='right'>{currencyFormatter.format(installmentPenalty)}</TableCell>
                <TableCell align='right' sx={{ fontWeight: 700 }}>{currencyFormatter.format(totalPaid)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Total Row */}
        <Stack direction='row' justifyContent='flex-end' sx={{ mt: 2 }}>
          <Stack
            direction='row'
            spacing={2}
            alignItems='center'
            sx={{
              px: 2,
              py: 1,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: alpha(theme.palette.primary.main, 0.06)
            }}
          >
            <Typography fontWeight={700}>Total Received:</Typography>
            <Typography variant='h6' fontWeight={700} color='primary.main'>
              {currencyFormatter.format(totalPaid)}
            </Typography>
          </Stack>
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* Payment Method & Reference */}
        <Stack direction='row' justifyContent='space-between' sx={{ mb: 4 }}>
          <Typography variant='body2' color='text.secondary'>
            Payment Method: <strong>{gatewayName}</strong>
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Reference: <strong>{payment.transaction_id || 'N/A'}</strong>
          </Typography>
        </Stack>

        {/* Footer */}
        <Stack direction='row' justifyContent='space-between' alignItems='flex-end'>
          <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 320 }}>
            This receipt confirms the above amount has been recorded against the mapped membership and installment in the jewellery savings system.
          </Typography>
          <Stack alignItems='center' spacing={0.5}>
            <Typography variant='body2' color='text.secondary'>Authorized Signatory</Typography>
            <Box sx={{ width: 120, borderBottom: '1px solid', borderColor: 'divider', mt: 2 }} />
          </Stack>
        </Stack>
      </Box>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          #print-receipt, #print-receipt * { visibility: visible; }
          #print-receipt { position: absolute; left: 0; top: 0; width: 100%; }
        }
        body.pdf-capture #print-receipt {
          background: #ffffff !important;
        }
        body.pdf-capture #print-receipt,
        body.pdf-capture #print-receipt * {
          color: #18181b !important;
        }
        body.pdf-capture #print-receipt .MuiDivider-root,
        body.pdf-capture #print-receipt hr {
          border-color: rgba(0, 0, 0, 0.12) !important;
        }
        body.pdf-capture #print-receipt .MuiTableCell-root {
          border-color: rgba(0, 0, 0, 0.12) !important;
        }
        body.pdf-capture #print-receipt [style*="border-color"] {
          border-color: rgba(0, 0, 0, 0.23) !important;
        }
        body.pdf-capture #print-receipt .MuiTableRow-head {
          background-color: rgba(0, 0, 0, 0.04) !important;
        }
      `}</style>
    </Stack>
  )
}

export default PaymentReceiptPage
