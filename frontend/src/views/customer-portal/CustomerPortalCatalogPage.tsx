'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { customerPortalRequest, resolveCustomerAssetUrl } from '@/libs/customerPortal'

type Product = {
  id: number
  name: string
  category?: string | null
  price: string | number
  image?: string | null
}

type CatalogResponse = {
  data: Product[]
  current_page: number
  last_page: number
}

const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

const CustomerPortalCatalogPage = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPage = async (targetPage: number) => {
    try {
      const response = await customerPortalRequest<CatalogResponse>(`/customer-portal/catalog?page=${targetPage}`)

      setProducts(prev => (targetPage === 1 ? response.data : [...prev, ...response.data]))
      setPage(response.current_page)
      setLastPage(response.last_page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load catalog.')
    }
  }

  useEffect(() => {
    void loadPage(1).finally(() => setLoading(false))
  }, [])

  const handleLoadMore = async () => {
    setLoadingMore(true)
    await loadPage(page + 1)
    setLoadingMore(false)
  }

  if (loading) {
    return (
      <Stack alignItems='center' sx={{ mt: 6 }}>
        <CircularProgress />
      </Stack>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        {error ? <Alert severity='warning'>{error}</Alert> : null}

        {products.length === 0 ? (
          <Alert severity='info'>No catalog items are available right now.</Alert>
        ) : (
          <Grid container spacing={3}>
            {products.map(product => (
              <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card component={Link} href={`/customer/panel/catalog/${product.id}`} sx={{ borderRadius: 2, height: '100%', display: 'block', textDecoration: 'none' }}>
                  {product.image ? (
                    <CardMedia component='img' height='160' image={resolveCustomerAssetUrl(product.image)} alt={product.name} sx={{ objectFit: 'cover' }} />
                  ) : (
                    <Box sx={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
                      <i className='ri-image-line' style={{ fontSize: '2.5rem', opacity: 0.4 }} />
                    </Box>
                  )}
                  <CardContent>
                    <Typography variant='subtitle1' fontWeight={700}>{product.name}</Typography>
                    {product.category ? <Typography variant='body2' color='text.secondary'>{product.category}</Typography> : null}
                    <Typography variant='h6' sx={{ mt: 1 }}>{currencyFormatter.format(Number(product.price || 0))}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {page < lastPage && (
          <Button variant='outlined' onClick={() => void handleLoadMore()} disabled={loadingMore} sx={{ alignSelf: 'center' }}>
            {loadingMore ? 'Loading...' : 'Load More'}
          </Button>
        )}
      </Stack>
    </Box>
  )
}

export default CustomerPortalCatalogPage
