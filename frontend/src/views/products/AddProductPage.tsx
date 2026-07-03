'use client'

import { useCallback, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useSession } from 'next-auth/react'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { resolveBackendApiUrl } from './data'
import ProductForm, { type ProductFormValues } from './ProductForm'

const AddProductPage = () => {
  const router = useRouter()
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

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
        | { message?: string; errors?: Record<string, string[]> }
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

      formData.append('name', values.name.trim())
      formData.append('category', values.category.trim())
      formData.append('price', values.price)
      if (imageFile) formData.append('image', imageFile)

      await request('/products', { method: 'POST', body: formData })

      router.push('/products')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent='space-between' alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <div>
            <Typography variant='h4' sx={{ mb: 1 }}>Add Product</Typography>
            <Typography color='text.secondary'>Upload a new product with an image to feature it in the customer app.</Typography>
          </div>
          <Button component={Link} href='/products' variant='outlined' color='secondary' startIcon={<i className='ri-arrow-left-line' />}>
            Back to Products
          </Button>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <ProductForm
          submitting={submitting}
          submitLabel='Save Product'
          error={error}
          fieldErrors={fieldErrors}
          onCancelHref='/products'
          onSubmit={(values, imageFile) => void handleSubmit(values, imageFile)}
        />
      </Grid>
    </Grid>
  )
}

export default AddProductPage
