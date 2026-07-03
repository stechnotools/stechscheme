'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { type ApiProduct, resolveBackendApiUrl, resolveProductImageUrl } from './data'
import ProductForm, { type ProductFormValues } from './ProductForm'

const EditProductPage = ({ productId }: { productId: number }) => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [product, setProduct] = useState<ApiProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!accessToken) throw new Error('Missing access token')

      const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(init?.headers || {})
        }
      })

      const payload = (await response.json().catch(() => null)) as
        | { data?: ApiProduct; message?: string; errors?: Record<string, string[]> }
        | null

      if (!response.ok) {
        if (payload?.errors) {
          const flattened: Record<string, string> = {}

          Object.entries(payload.errors).forEach(([key, messages]) => {
            flattened[key] = messages[0]
          })
          setFieldErrors(flattened)
        }

        throw new Error(payload?.message || 'Request failed')
      }

      return payload as T
    },
    [accessToken]
  )

  useEffect(() => {
    if (status !== 'authenticated') return

    request<{ data: ApiProduct }>(`/products/${productId}`)
      .then(response => setProduct(response.data))
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Failed to load product.'))
      .finally(() => setLoading(false))
  }, [status, productId, request])

  const handleSubmit = async (values: ProductFormValues, imageFile: File | null) => {
    if (!values.name.trim() || !values.category.trim() || !values.price.trim()) {
      setError('Please fill in name, category, and price.')

      return
    }

    setSubmitting(true)
    setError(null)
    setFieldErrors({})

    try {
      const formData = new FormData()

      // Laravel doesn't parse multipart bodies on a real PUT request, so we
      // POST with a `_method` override — Laravel's method-spoofing middleware
      // routes it as PUT while still letting PHP populate $_FILES correctly.
      formData.append('_method', 'PUT')
      formData.append('name', values.name.trim())
      formData.append('category', values.category.trim())
      formData.append('price', values.price)
      if (imageFile) formData.append('image', imageFile)

      await request(`/products/${productId}`, { method: 'POST', body: formData })

      router.push('/products')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent='space-between' alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <div>
            <Typography variant='h4' sx={{ mb: 1 }}>Edit Product</Typography>
            <Typography color='text.secondary'>Update product details or replace its image.</Typography>
          </div>
          <Button component={Link} href='/products' variant='outlined' color='secondary' startIcon={<i className='ri-arrow-left-line' />}>
            Back to Products
          </Button>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12 }}>
        {loading ? (
          <Stack alignItems='center' sx={{ py: 8 }}>
            <CircularProgress />
          </Stack>
        ) : loadError || !product ? (
          <Alert severity='error'>{loadError || 'Product not found.'}</Alert>
        ) : (
          <ProductForm
            initialValues={{ name: product.name, category: product.category, price: String(product.price) }}
            initialImagePreview={resolveProductImageUrl(product.image)}
            submitting={submitting}
            submitLabel='Update Product'
            error={error}
            fieldErrors={fieldErrors}
            onCancelHref='/products'
            onSubmit={(values, imageFile) => void handleSubmit(values, imageFile)}
          />
        )}
      </Grid>
    </Grid>
  )
}

export default EditProductPage
