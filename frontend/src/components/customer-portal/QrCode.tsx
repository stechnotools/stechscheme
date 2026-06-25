'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import QRCode from 'qrcode'

const QrCode = ({ value, size = 160 }: { value: string; size?: number }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    QRCode.toDataURL(value, { width: size, margin: 1, color: { dark: '#18120A', light: '#FFFFFF' } })
      .then(url => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        // QR generation failing is non-fatal — the manual install button still works.
      })

    return () => {
      cancelled = true
    }
  }, [value, size])

  if (!dataUrl) {
    return <Box sx={{ width: size, height: size, bgcolor: 'action.hover', borderRadius: 2 }} />
  }

  return (
    <Box
      component='img'
      src={dataUrl}
      alt='QR code'
      sx={{ width: size, height: size, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
    />
  )
}

export default QrCode
