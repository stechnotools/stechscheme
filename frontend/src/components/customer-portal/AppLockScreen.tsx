'use client'

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import {
  isBiometricEnabled,
  markUnlockedThisSession,
  verifyBiometric,
  verifyMpin
} from '@/libs/customerAppLock'

const PALETTE = {
  purpleDk: '#160B33',
  purple: '#241454',
  purpleLt: '#4B32A8',
  gold: '#C9A84C',
  goldLt: '#E2C46A',
  red: '#F08A8A'
}

const PIN_LENGTH = 4
const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

const AppLockScreen = ({ onUnlock }: { onUnlock: () => void }) => {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [biometricAvailable] = useState(() => isBiometricEnabled())
  const [checkingBiometric, setCheckingBiometric] = useState(false)

  const attemptBiometric = async () => {
    setCheckingBiometric(true)
    setError(null)

    try {
      const ok = await verifyBiometric()

      if (ok) {
        markUnlockedThisSession()
        onUnlock()
      } else {
        setError('Biometric check failed. Enter your MPIN instead.')
      }
    } finally {
      setCheckingBiometric(false)
    }
  }

  // Offer biometric immediately on mount so returning users can unlock in one
  // tap without touching the keypad first.
  useEffect(() => {
    if (biometricAvailable) void attemptBiometric()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDigit = async (digit: string) => {
    if (checkingBiometric) return

    if (digit === 'del') {
      setPin(prev => prev.slice(0, -1))
      setError(null)

      return
    }

    if (!digit || pin.length >= PIN_LENGTH) return

    const nextPin = pin + digit

    setPin(nextPin)
    setError(null)

    if (nextPin.length === PIN_LENGTH) {
      const ok = await verifyMpin(nextPin)

      if (ok) {
        markUnlockedThisSession()
        onUnlock()
      } else {
        setError('Incorrect MPIN. Try again.')
        setShake(true)
        setTimeout(() => setShake(false), 400)
        setPin('')
      }
    }
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: theme => theme.zIndex.modal + 1,
        background: `linear-gradient(160deg, ${PALETTE.purpleDk} 0%, ${PALETTE.purple} 60%, ${PALETTE.purpleLt} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: 'rgba(201,168,76,0.16)',
          border: `1px solid rgba(201,168,76,0.35)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2
        }}
      >
        <i className='ri-lock-2-line' style={{ color: PALETTE.goldLt, fontSize: '1.8rem' }} />
      </Box>

      <Typography sx={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, mb: 0.5 }}>Enter MPIN</Typography>
      <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', mb: 3 }}>
        {checkingBiometric ? 'Checking biometric...' : 'Unlock to continue'}
      </Typography>

      <Stack
        direction='row'
        spacing={1.5}
        sx={{
          mb: 1,
          animation: shake ? 'appLockShake 0.4s' : 'none',
          '@keyframes appLockShake': {
            '0%, 100%': { transform: 'translateX(0)' },
            '25%': { transform: 'translateX(-8px)' },
            '75%': { transform: 'translateX(8px)' }
          }
        }}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              bgcolor: i < pin.length ? PALETTE.gold : 'transparent',
              border: `1.5px solid ${i < pin.length ? PALETTE.gold : 'rgba(255,255,255,0.4)'}`
            }}
          />
        ))}
      </Stack>

      <Box sx={{ minHeight: 24, mb: 2 }}>
        {error && <Typography sx={{ color: PALETTE.red, fontSize: '0.75rem' }}>{error}</Typography>}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, width: 240 }}>
        {KEYPAD.map((key, idx) => {
          if (key === '') return <Box key={`empty-${idx}`} />

          return (
            <Button
              key={key}
              onClick={() => void handleDigit(key)}
              disabled={checkingBiometric}
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                minWidth: 0,
                color: '#fff',
                fontSize: key === 'del' ? '1.1rem' : '1.3rem',
                fontWeight: 600,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }
              }}
            >
              {key === 'del' ? <i className='ri-arrow-left-line' /> : key}
            </Button>
          )
        })}
      </Box>

      {biometricAvailable && (
        <Button
          onClick={() => void attemptBiometric()}
          disabled={checkingBiometric}
          startIcon={checkingBiometric ? <CircularProgress size={16} sx={{ color: PALETTE.goldLt }} /> : <i className='ri-fingerprint-line' />}
          sx={{ mt: 3, color: PALETTE.goldLt, textTransform: 'none', fontWeight: 600 }}
        >
          {checkingBiometric ? 'Checking...' : 'Use Biometric'}
        </Button>
      )}
    </Box>
  )
}

export default AppLockScreen
