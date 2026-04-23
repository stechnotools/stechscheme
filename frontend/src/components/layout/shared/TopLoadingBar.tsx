'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Box from '@mui/material/Box'

const TopLoadingBar = () => {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    setLoading(true)

    const done = () => setLoading(false)

    timerRef.current = setTimeout(done, 600)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pathname])

  if (!loading) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 9999,
        background: 'linear-gradient(90deg, #1d4ed8, #0f766e, #1d4ed8)',
        backgroundSize: '200% 100%',
        animation: 'topLoadingSlide 1.2s ease-in-out infinite',
        '@keyframes topLoadingSlide': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' }
        }
      }}
    />
  )
}

export default TopLoadingBar
