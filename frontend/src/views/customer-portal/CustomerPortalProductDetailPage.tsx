'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { customerPortalRequest, resolveCustomerAssetUrl } from '@/libs/customerPortal'

const PALETTE = {
  purple: '#241454',
  purpleLt: '#4B32A8',
  purpleSoft: '#EFEAFB',
  gold: '#C9A84C',
  ink: '#1B1030',
  muted: '#71708A'
}

type Product = {
  id: number
  name: string
  category?: string | null
  price: string | number
  image?: string | null
}

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

const CustomerPortalProductDetailPage = ({ productId }: { productId: number }) => {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    customerPortalRequest<{ data: Product }>(`/customer-portal/catalog/${productId}`)
      .then(response => setProduct(response.data))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load product.'))
      .finally(() => setLoading(false))
  }, [productId])

  if (loading) {
    return (
      <Stack alignItems='center' sx={{ mt: 8 }}>
        <CircularProgress sx={{ color: PALETTE.purple }} />
      </Stack>
    )
  }

  if (error || !product) {
    return (
      <Stack sx={{ p: 2, mt: 2 }}>
        <Alert severity='error'>{error || 'Product not found.'}</Alert>
      </Stack>
    )
  }

  return (
    <Box sx={{ pb: 4 }}>
      {product.image ? (
        <Box
          component='img'
          src={resolveCustomerAssetUrl(product.image)}
          alt={product.name}
          sx={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Box sx={{ width: '100%', height: 280, bgcolor: PALETTE.purpleSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className='ri-gem-line' style={{ fontSize: '3rem', color: PALETTE.purpleLt, opacity: 0.6 }} />
        </Box>
      )}

      <Stack spacing={2} sx={{ px: 2, pt: 2.5 }}>
        {product.category && (
          <Chip
            label={product.category}
            size='small'
            sx={{ alignSelf: 'flex-start', bgcolor: PALETTE.purpleSoft, color: PALETTE.purpleLt, fontWeight: 600 }}
          />
        )}

        <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, color: PALETTE.ink }}>{product.name}</Typography>

        <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color: PALETTE.purpleLt }}>
          {currencyFormatter.format(Number(product.price || 0))}
        </Typography>

        <Typography sx={{ fontSize: '0.8rem', color: PALETTE.muted }}>
          Price shown is indicative and may vary with live gold rates and making charges. Visit a store or contact
          your relationship manager to check availability and place a booking.
        </Typography>

        <Stack direction='row' spacing={1.5} sx={{ pt: 1 }}>
          <Button
            component={Link}
            href='/customer/panel/store-locator'
            fullWidth
            sx={{ bgcolor: PALETTE.gold, color: PALETTE.purple, fontWeight: 700, '&:hover': { bgcolor: PALETTE.gold, opacity: 0.9 } }}
          >
            Visit a Store
          </Button>
          <Button component={Link} href='/customer/panel/catalog' fullWidth variant='outlined' sx={{ color: PALETTE.purpleLt, borderColor: PALETTE.purpleLt }}>
            More Products
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

export default CustomerPortalProductDetailPage
