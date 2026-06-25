'use client'

import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { customerPortalRequest } from '@/libs/customerPortal'

type WalletSummary = {
  referral_code: string | null
  points_balance: number
  lifetime_points: number
}

type LedgerTransaction = {
  id: number
  transaction_type: 'Credit' | 'Debit'
  points: string | number
  description?: string | null
  transaction_date: string
}

const CustomerPortalWalletPage = () => {
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await customerPortalRequest<{ data: WalletSummary }>('/customer-portal/wallet')
        setWallet(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load wallet.')
      }
    }

    const loadTransactions = async () => {
      try {
        const response = await customerPortalRequest<{ data: LedgerTransaction[] }>('/customer-portal/wallet/transactions')
        setTransactions(response.data)
      } catch {
        // Transaction history is a nice-to-have — don't block the wallet summary on it.
      }
    }

    void load()
    void loadTransactions()
  }, [])

  const referralCode = wallet?.referral_code

  const copyCode = () => {
    if (!referralCode) return
    void navigator.clipboard.writeText(referralCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareText = `Join the jewellery savings scheme using my referral code ${referralCode ?? ''} and start saving today!`

  if (!wallet) {
    return (
      <Box sx={{ p: 4 }}>
        {error ? <Alert severity='error'>{error}</Alert> : <Stack alignItems='center' sx={{ mt: 6 }}><CircularProgress /></Stack>}
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Card sx={{ color: 'common.white', background: 'linear-gradient(135deg, #0f172a 0%, #155e75 65%, #f59e0b 100%)' }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={2}>
              <Typography variant='overline' sx={{ color: 'rgba(255,255,255,0.78)' }}>
                Loyalty Points Balance
              </Typography>
              <Typography variant='h3'>{wallet.points_balance.toLocaleString('en-IN')} pts</Typography>
              <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Lifetime earned: {wallet.lifetime_points.toLocaleString('en-IN')} pts
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {error ? <Alert severity='warning'>{error}</Alert> : null}

        {referralCode ? (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Your Referral Code
                </Typography>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Chip label={referralCode} sx={{ fontSize: '1rem', fontWeight: 700, px: 1, height: 40 }} />
                  <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
                    <IconButton onClick={copyCode}>
                      <i className={copied ? 'ri-check-line' : 'ri-file-copy-line'} />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                  <Button
                    variant='outlined'
                    color='success'
                    startIcon={<i className='ri-whatsapp-line' />}
                    component='a'
                    href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    Share via WhatsApp
                  </Button>
                  <Button
                    variant='outlined'
                    startIcon={<i className='ri-message-2-line' />}
                    component='a'
                    href={`sms:?body=${encodeURIComponent(shareText)}`}
                  >
                    Share via SMS
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent>
            <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', mb: 2 }}>
              Points History
            </Typography>
            {transactions.length > 0 ? (
              <Stack spacing={1.5}>
                {transactions.map(transaction => (
                  <Stack
                    key={transaction.id}
                    direction='row'
                    justifyContent='space-between'
                    alignItems='center'
                    sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}
                  >
                    <div>
                      <Typography fontWeight={700}>{transaction.description || transaction.transaction_type}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {new Date(transaction.transaction_date).toLocaleDateString('en-IN')}
                      </Typography>
                    </div>
                    <Typography fontWeight={700} color={transaction.transaction_type === 'Credit' ? 'success.main' : 'error.main'}>
                      {transaction.transaction_type === 'Credit' ? '+' : '-'}
                      {Number(transaction.points).toLocaleString('en-IN')} pts
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Alert severity='info'>No points activity yet.</Alert>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  )
}

export default CustomerPortalWalletPage
