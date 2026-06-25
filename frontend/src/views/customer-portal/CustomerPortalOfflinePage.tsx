'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

const CustomerPortalOfflinePage = () => {
  const router = useRouter()
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        textAlign: 'center'
      }}
    >
      <Stack spacing={3} alignItems='center' sx={{ maxWidth: 360 }}>
        <i className='ri-wifi-off-line' style={{ fontSize: '3.5rem', opacity: 0.5 }} />
        <Typography variant='h5'>You&apos;re offline</Typography>
        <Typography color='text.secondary'>
          {online
            ? 'Connection restored — you can go back now.'
            : 'Check your internet connection. Some previously loaded pages may still be available.'}
        </Typography>
        <Button variant='contained' onClick={() => (online ? router.replace('/customer/panel') : window.location.reload())}>
          {online ? 'Back to Dashboard' : 'Retry'}
        </Button>
      </Stack>
    </Box>
  )
}

export default CustomerPortalOfflinePage
