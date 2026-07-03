'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { type ApiProduct, productCurrencyFormatter, resolveBackendApiUrl, resolveProductImageUrl } from './data'

const ProductListPage = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [products, setProducts] = useState<ApiProduct[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiProduct | null>(null)
  const [deleting, setDeleting] = useState(false)

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!accessToken) throw new Error('Missing access token')

      const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
          ...(init?.headers || {})
        }
      })

      const payload = (await response.json().catch(() => null)) as { data?: ApiProduct[]; message?: string } | null

      if (!response.ok) {
        throw new Error(payload?.message || 'Request failed')
      }

      return payload as T
    },
    [accessToken]
  )

  const loadProducts = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      const response = await request<{ data: ApiProduct[] }>('/products?per_page=100&sort_by=created_at&sort_direction=desc')

      setProducts(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, request])

  useEffect(() => {
    if (status === 'authenticated') {
      void loadProducts()
    }
  }, [status, loadProducts])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return products

    return products.filter(
      product => product.name.toLowerCase().includes(query) || product.category.toLowerCase().includes(query)
    )
  }, [products, search])

  const confirmDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)

    try {
      await request(`/products/${deleteTarget.id}`, { method: 'DELETE' })
      setSuccessMessage(`${deleteTarget.name} was deleted successfully.`)
      setDeleteTarget(null)
      await loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent='space-between' alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <div>
            <Typography variant='h4' sx={{ mb: 1 }}>Product Master</Typography>
            <Typography color='text.secondary'>
              Products uploaded here appear in the customer app&apos;s &quot;Exclusive Offers for You&quot; dashboard section and popup.
            </Typography>
          </div>
          <Button component={Link} href='/products/add' variant='contained' startIcon={<i className='ri-add-line' />}>
            Add Product
          </Button>
        </Stack>
      </Grid>

      {error ? <Grid size={{ xs: 12 }}><Alert severity='error'>{error}</Alert></Grid> : null}
      {successMessage ? <Grid size={{ xs: 12 }}><Alert severity='success' onClose={() => setSuccessMessage(null)}>{successMessage}</Alert></Grid> : null}

      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label='Search products'
          placeholder='Search by name or category'
          value={search}
          onChange={event => setSearch(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <i className='ri-search-line' />
              </InputAdornment>
            )
          }}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        {loading ? (
          <Stack alignItems='center' sx={{ py: 8 }}>
            <CircularProgress />
          </Stack>
        ) : filteredProducts.length === 0 ? (
          <Alert severity='info'>
            {products.length === 0
              ? 'No products yet. Add your first product to start showing it in the customer app.'
              : 'No products match your search.'}
          </Alert>
        ) : (
          <Grid container spacing={4}>
            {filteredProducts.map(product => (
              <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card sx={{ height: '100%' }}>
                  {product.image ? (
                    <CardMedia component='img' height={160} image={resolveProductImageUrl(product.image)} alt={product.name} sx={{ objectFit: 'cover' }} />
                  ) : (
                    <Box sx={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
                      <i className='ri-image-line' style={{ fontSize: '2.5rem', opacity: 0.4 }} />
                    </Box>
                  )}
                  <CardContent>
                    <Typography variant='subtitle1' fontWeight={700} noWrap>{product.name}</Typography>
                    <Typography variant='body2' color='text.secondary'>{product.category}</Typography>
                    <Typography variant='h6' sx={{ mt: 1 }}>{productCurrencyFormatter.format(Number(product.price || 0))}</Typography>
                    <Stack direction='row' spacing={1} justifyContent='flex-end' sx={{ mt: 2 }}>
                      <Button component={Link} href={`/products/${product.id}/edit`} size='small' variant='outlined' startIcon={<i className='ri-edit-2-line' />}>
                        Edit
                      </Button>
                      <IconButton color='error' size='small' onClick={() => setDeleteTarget(product)}>
                        <i className='ri-delete-bin-6-line' />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Grid>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth='xs' fullWidth>
        <DialogContent sx={{ pt: 6, textAlign: 'center' }}>
          <Box sx={{ mb: 3, color: 'warning.main', fontSize: 72 }}>
            <i className='ri-error-warning-line' />
          </Box>
          <Typography variant='h4' sx={{ mb: 1.5 }}>Delete product?</Typography>
          <Typography color='text.secondary'>
            {deleteTarget ? `${deleteTarget.name} will be removed and will no longer show in the customer app.` : ''}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 5, px: 4 }}>
          <Button variant='contained' color='error' onClick={() => void confirmDelete()} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Product'}
          </Button>
          <Button variant='outlined' color='secondary' onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default ProductListPage
