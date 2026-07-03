'use client'

import { useState } from 'react'

import Link from 'next/link'

import { useDropzone } from 'react-dropzone'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import type { BoxProps } from '@mui/material/Box'

import AppReactDropzone from '@/libs/styles/AppReactDropzone'

const ImageDropzone = styled(AppReactDropzone)<BoxProps>(({ theme }) => ({
  '& .dropzone': {
    minHeight: 'unset',
    padding: theme.spacing(3),
    border: `2px dashed ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    cursor: 'pointer',
    '&:hover': { borderColor: theme.palette.primary.main }
  }
}))

export type ProductFormValues = {
  name: string
  category: string
  price: string
}

export type ProductFormProps = {
  initialValues?: ProductFormValues
  initialImagePreview?: string | null
  submitting: boolean
  submitLabel: string
  error: string | null
  fieldErrors?: Record<string, string>
  onCancelHref: string
  onSubmit: (values: ProductFormValues, imageFile: File | null) => void
}

const emptyValues: ProductFormValues = { name: '', category: '', price: '' }

const ProductForm = ({
  initialValues = emptyValues,
  initialImagePreview = null,
  submitting,
  submitLabel,
  error,
  fieldErrors = {},
  onCancelHref,
  onSubmit
}: ProductFormProps) => {
  const [values, setValues] = useState<ProductFormValues>(initialValues)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(initialImagePreview)

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop: files => {
      if (files[0]) {
        setImageFile(files[0])
        setImagePreview(URL.createObjectURL(files[0]))
      }
    }
  })

  const update = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Card>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={4}>
          {error ? <Alert severity='error'>{error}</Alert> : null}

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  label='Product Name'
                  value={values.name}
                  onChange={event => update('name', event.target.value)}
                  error={Boolean(fieldErrors.name)}
                  helperText={fieldErrors.name}
                />
                <TextField
                  fullWidth
                  label='Category'
                  placeholder='e.g. Necklace, Bangles, Ring'
                  value={values.category}
                  onChange={event => update('category', event.target.value)}
                  error={Boolean(fieldErrors.category)}
                  helperText={fieldErrors.category}
                />
                <TextField
                  fullWidth
                  type='number'
                  label='Price'
                  value={values.price}
                  onChange={event => update('price', event.target.value)}
                  error={Boolean(fieldErrors.price)}
                  helperText={fieldErrors.price}
                  InputProps={{ startAdornment: <InputAdornment position='start'>₹</InputAdornment> }}
                />
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant='subtitle2' fontWeight={600} gutterBottom>Product Image</Typography>
              <ImageDropzone>
                <div {...getRootProps({ className: 'dropzone' })}>
                  <input {...getInputProps()} />
                  {imagePreview ? (
                    <Box sx={{ position: 'relative', display: 'inline-block' }}>
                      <img src={imagePreview} alt='Product preview' style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 8, display: 'block' }} />
                      <IconButton
                        size='small'
                        color='error'
                        onClick={event => {
                          event.stopPropagation()
                          setImageFile(null)
                          setImagePreview(null)
                        }}
                        sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
                      >
                        <i className='ri-close-line' />
                      </IconButton>
                    </Box>
                  ) : (
                    <Stack alignItems='center' spacing={1}>
                      <i className='ri-image-add-line' style={{ fontSize: 32, opacity: 0.5 }} />
                      <Typography variant='body2' color='text.secondary'>Drag &amp; drop or click to upload a product image</Typography>
                      <Typography variant='caption' color='text.disabled'>PNG, JPG, WEBP up to 5MB</Typography>
                    </Stack>
                  )}
                </div>
              </ImageDropzone>
              {fieldErrors.image ? <Typography variant='caption' color='error' sx={{ mt: 0.5, display: 'block' }}>{fieldErrors.image}</Typography> : null}
              <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
                This is the image shown in the customer app&apos;s offers section and popup.
              </Typography>
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end'>
            <Button component={Link} href={onCancelHref} variant='outlined' color='secondary' disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant='contained'
              disabled={submitting}
              onClick={() => onSubmit(values, imageFile)}
            >
              {submitting ? 'Saving...' : submitLabel}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default ProductForm
