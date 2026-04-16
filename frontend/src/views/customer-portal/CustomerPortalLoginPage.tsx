'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { resolveBackendApiUrl, setCustomerPortalToken } from '@/libs/customerPortal'

const CustomerPortalLoginPage = () => {
  const router = useRouter()
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!mobile.trim() || !password.trim()) {
      setError('Mobile number and password are required.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`${resolveBackendApiUrl()}/customer-auth/login`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mobile: mobile.trim(),
          password
        })
      })

      const payload = (await response.json().catch(() => null)) as { token?: string; message?: string; errors?: Record<string, string[]> } | null

      if (!response.ok || !payload?.token) {
        const validationMessage = payload?.errors ? Object.values(payload.errors).flat().join(' ') : null
        throw new Error(validationMessage || payload?.message || 'Customer login failed.')
      }

      setCustomerPortalToken(payload.token)
      router.replace('/customer/panel')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Customer login failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        background: 'linear-gradient(135deg, #1f2937 0%, #0f766e 45%, #f59e0b 100%)'
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 460, borderRadius: 4 }}>
        <CardContent sx={{ p: 5 }}>
          <Stack spacing={3}>
            <div>
              <Typography variant='overline' sx={{ color: '#b45309', letterSpacing: '0.14em' }}>
                Customer Panel
              </Typography>
              <Typography variant='h4'>Login with mobile and password</Typography>
              <Typography color='text.secondary' sx={{ mt: 1 }}>
                View your jewellery scheme membership card, installments, payments, and maturity details.
              </Typography>
            </div>

            {error ? <Alert severity='error'>{error}</Alert> : null}

            <TextField fullWidth label='Mobile Number' value={mobile} onChange={event => setMobile(event.target.value)} />
            <TextField fullWidth label='Password' type='password' value={password} onChange={event => setPassword(event.target.value)} />

            <Button variant='contained' onClick={() => void handleSubmit()} disabled={saving}>
              {saving ? 'Signing in...' : 'Open Customer Panel'}
            </Button>

            <Typography variant='body2' color='text.secondary'>
              Staff login? <Link href='/login'>Go to dashboard login</Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default CustomerPortalLoginPage
