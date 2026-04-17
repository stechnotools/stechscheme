'use client'

import { type ChangeEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { getCustomerName, resolveBackendApiUrl, type Customer, type CustomerResponse } from './customerData'

const getBackendOrigin = () => resolveBackendApiUrl().replace(/\/api$/, '')

const resolvePreviewUrl = (value?: string | null) => {
  if (!value) return ''

  if (/^(blob:|data:|https?:\/\/)/i.test(value)) {
    return value
  }

  const normalizedValue = value.startsWith('/') ? value : `/${value}`

  return `${getBackendOrigin()}${normalizedValue}`
}

const getFileExtension = (value?: string | null) => {
  if (!value) return ''

  const sanitizedValue = value.split('?')[0] || value
  const extension = sanitizedValue.split('.').pop()

  return extension?.toLowerCase() || ''
}

const isImageFile = (value?: string | null) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(getFileExtension(value))

const isPdfFile = (value?: string | null) => getFileExtension(value) === 'pdf'
const isPhotoFile = (value?: string | null) => ['jpg', 'jpeg', 'png'].includes(getFileExtension(value))
const isValidAadhaarNumber = (value?: string | null) => !value || /^\d{12}$/.test(value)
const isValidPanNumber = (value?: string | null) => !value || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value)

const FilePreviewCard = ({
  title,
  value,
  previewUrl
}: {
  title: string
  value?: string | null
  previewUrl?: string
}) => {
  const hasPreview = Boolean(previewUrl)
  const imagePreview = hasPreview && (isImageFile(previewUrl) || isImageFile(value))
  const pdfPreview = hasPreview && !imagePreview && (isPdfFile(previewUrl) || isPdfFile(value))
  const fileLabel = value?.split(/[\\/]/).pop() || 'No file selected'

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant='h5'>{title}</Typography>
          {imagePreview ? (
            <Box
              component='img'
              src={previewUrl}
              alt={title}
              sx={{
                width: '100%',
                height: 240,
                objectFit: 'cover',
                borderRadius: 'var(--mui-shape-borderRadius)',
                border: '1px solid var(--mui-palette-divider)'
              }}
            />
          ) : null}
          {pdfPreview ? (
            <Box
              component='iframe'
              src={previewUrl}
              title={title}
              sx={{
                width: '100%',
                height: 280,
                border: '1px solid var(--mui-palette-divider)',
                borderRadius: 'var(--mui-shape-borderRadius)',
                p: 3
              }}
            />
          ) : null}
          {!imagePreview && !pdfPreview ? (
            <Box
              sx={{
                minHeight: 140,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed var(--mui-palette-divider)',
                borderRadius: 'var(--mui-shape-borderRadius)',
                bgcolor: 'var(--mui-palette-action-hover)',
                px: 3,
                textAlign: 'center'
              }}
            >
              <Typography variant='body2' color='text.secondary'>
                {hasPreview ? 'Preview is not available for this file type.' : 'No file selected yet.'}
              </Typography>
            </Box>
          ) : null}
          <Stack direction='row' spacing={1} alignItems='center' justifyContent='space-between'>
            <Typography variant='body2' color='text.secondary' sx={{ wordBreak: 'break-all' }}>
              {fileLabel}
            </Typography>
            {hasPreview ? (
              <Button component='a' href={previewUrl} target='_blank' rel='noreferrer' size='small'>
                Open
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

const CustomerKycUpdatePage = ({ customerId }: { customerId: number }) => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [kycStatus, setKycStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [aadhaarNumber, setAadhaarNumber] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [aadhaarFile, setAadhaarFile] = useState('')
  const [panFile, setPanFile] = useState('')
  const [photo, setPhoto] = useState('')
  const [aadhaarPreview, setAadhaarPreview] = useState('')
  const [panPreview, setPanPreview] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [pendingAadhaarFile, setPendingAadhaarFile] = useState<File | null>(null)
  const [pendingPanFile, setPendingPanFile] = useState<File | null>(null)
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null)
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [stateName, setStateName] = useState('')
  const [pincode, setPincode] = useState('')
  const [remarks, setRemarks] = useState('')

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!accessToken) {
        throw new Error('Missing access token')
      }

      const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
          ...(init?.headers || {})
        }
      })

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; errors?: Record<string, string[]> }
        | null

      if (!response.ok) {
        const validationMessage = payload?.errors
          ? Object.values(payload.errors)
              .flat()
              .join(' ')
          : null

        throw new Error(validationMessage || payload?.message || 'Request failed')
      }

      return payload as T
    },
    [accessToken]
  )

  useEffect(() => {
    if (status === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')
      return
    }

    if (status !== 'authenticated') return

    const loadCustomer = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await request<CustomerResponse>(`/customers/${customerId}`)
        setCustomer(response.data)
        setKycStatus(response.data.kyc?.status || 'pending')
        setAadhaarNumber(response.data.kyc?.aadhaar_number || '')
        setPanNumber(response.data.kyc?.pan_number || '')
        setAadhaarFile(response.data.kyc?.aadhaar_file || '')
        setPanFile(response.data.kyc?.pan_file || '')
        setPhoto(response.data.kyc?.photo || '')
        setAadhaarPreview(resolvePreviewUrl(response.data.kyc?.aadhaar_file))
        setPanPreview(resolvePreviewUrl(response.data.kyc?.pan_file))
        setPhotoPreview(resolvePreviewUrl(response.data.kyc?.photo))
        setPendingAadhaarFile(null)
        setPendingPanFile(null)
        setPendingPhotoFile(null)
        setAddress(response.data.kyc?.address || '')
        setCity(response.data.kyc?.city || '')
        setStateName(response.data.kyc?.state || '')
        setPincode(response.data.kyc?.pincode || '')
        setRemarks(response.data.kyc?.remarks || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customer KYC.')
      } finally {
        setLoading(false)
      }
    }

    void loadCustomer()
  }, [status, accessToken, customerId, request])

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
      if (aadhaarPreview.startsWith('blob:')) URL.revokeObjectURL(aadhaarPreview)
      if (panPreview.startsWith('blob:')) URL.revokeObjectURL(panPreview)
    }
  }, [aadhaarPreview, panPreview, photoPreview])

  const handleFileSelect = (
    event: ChangeEvent<HTMLInputElement>,
    setValue: (value: string) => void,
    setPreview: (value: string) => void,
    setFile: (file: File | null) => void,
    currentPreview: string,
    options: {
      allowedExtensions: string[]
      errorMessage: string
      fieldKey: 'photo' | 'aadhaar_file' | 'pan_file'
    }
  ) => {
    const file = event.target.files?.[0]

    if (!file) return

    const extension = getFileExtension(file.name)

    if (!options.allowedExtensions.includes(extension)) {
      setFieldErrors(previous => ({
        ...previous,
        [options.fieldKey]: options.errorMessage
      }))
      event.target.value = ''

      return
    }

    if (currentPreview.startsWith('blob:')) {
      URL.revokeObjectURL(currentPreview)
    }

    const objectUrl = URL.createObjectURL(file)

    setFieldErrors(previous => {
      const next = { ...previous }
      delete next[options.fieldKey]

      return next
    })
    setValue(file.name)
    setPreview(objectUrl)
    setFile(file)
    setError(null)
    setSuccess(null)
    event.target.value = ''
  }

  const validateForm = () => {
    const nextErrors: Record<string, string> = {}
    const trimmedAadhaar = aadhaarNumber.trim()
    const trimmedPan = panNumber.trim().toUpperCase()
    const trimmedPhoto = photo.trim()
    const trimmedAadhaarFile = aadhaarFile.trim()
    const trimmedPanFile = panFile.trim()

    if (!isValidAadhaarNumber(trimmedAadhaar)) {
      nextErrors.aadhaar_number = 'Aadhaar number must be exactly 12 digits.'
    }

    if (!isValidPanNumber(trimmedPan)) {
      nextErrors.pan_number = 'PAN number must be in format AAAAA9999A.'
    }

    if (trimmedPhoto && !isPhotoFile(trimmedPhoto)) {
      nextErrors.photo = 'Photo must be a JPG, JPEG, or PNG file.'
    }

    if (trimmedAadhaarFile && !isPdfFile(trimmedAadhaarFile)) {
      nextErrors.aadhaar_file = 'Aadhaar file must be a PDF.'
    }

    if (trimmedPanFile && !isPdfFile(trimmedPanFile)) {
      nextErrors.pan_file = 'PAN file must be a PDF.'
    }

    setFieldErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!customer) return

    if (!validateForm()) {
      setError('Please fix the validation errors before saving.')
      setSuccess(null)

      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()

      formData.append('customer_id', String(customer.id))
      if (aadhaarNumber.trim()) formData.append('aadhaar_number', aadhaarNumber.trim())
      if (panNumber.trim().toUpperCase()) formData.append('pan_number', panNumber.trim().toUpperCase())
      if (address.trim()) formData.append('address', address.trim())
      if (city.trim()) formData.append('city', city.trim())
      if (stateName.trim()) formData.append('state', stateName.trim())
      if (pincode.trim()) formData.append('pincode', pincode.trim())
      if (remarks.trim()) formData.append('remarks', remarks.trim())
      formData.append('status', kycStatus)

      if (kycStatus === 'approved') {
        formData.append('verified_at', new Date().toISOString().slice(0, 19).replace('T', ' '))
      }

      if (pendingPhotoFile) {
        formData.append('photo', pendingPhotoFile)
      } else if (photo.trim()) {
        formData.append('existing_photo', photo.trim())
      }

      if (pendingAadhaarFile) {
        formData.append('aadhaar_file', pendingAadhaarFile)
      } else if (aadhaarFile.trim()) {
        formData.append('existing_aadhaar_file', aadhaarFile.trim())
      }

      if (pendingPanFile) {
        formData.append('pan_file', pendingPanFile)
      } else if (panFile.trim()) {
        formData.append('existing_pan_file', panFile.trim())
      }

      await request('/kycs', {
        method: 'POST',
        body: formData
      })

      setSuccess('Customer KYC updated successfully.')
      router.push(`/customers/${customer.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer KYC.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Stack alignItems='center' justifyContent='center' sx={{ minHeight: 320 }}>
        <CircularProgress />
      </Stack>
    )
  }

  if (!customer) {
    return <Alert severity='error'>{error || 'Customer not found.'}</Alert>
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            color: 'common.white',
            background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 45%, #0f766e 100%)'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 6 } }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent='space-between' spacing={3}>
              <Stack direction='row' spacing={2} alignItems='center'>
                <Avatar src={photo || undefined} alt={getCustomerName(customer)} sx={{ width: 72, height: 72 }}>
                  {getCustomerName(customer).charAt(0).toUpperCase()}
                </Avatar>
                <div>
                  <Chip
                    label='KYC Update'
                    sx={{ mb: 1.5, bgcolor: 'rgba(255,255,255,0.12)', color: 'common.white' }}
                  />
                  <Typography variant='h4' sx={{ color: 'common.white' }}>
                    {getCustomerName(customer)}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.82)' }}>
                    Update identity files, photo, and full location details in one place.
                  </Typography>
                </div>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button component={Link} href={`/customers/${customer.id}`} variant='outlined' sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.3)' }}>
                  Back to Profile
                </Button>
                <Button component={Link} href={`/customers/${customer.id}/edit`} variant='outlined' sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.3)' }}>
                  Edit Customer
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              {error ? <Alert severity='error'>{error}</Alert> : null}
              {success ? <Alert severity='success'>{success}</Alert> : null}

              <Typography variant='h5'>Identity & Verification</Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label='KYC Status'
                    value={kycStatus}
                    onChange={event => setKycStatus(event.target.value as 'pending' | 'approved' | 'rejected')}
                  >
                    <MenuItem value='pending'>Pending</MenuItem>
                    <MenuItem value='approved'>Approved</MenuItem>
                    <MenuItem value='rejected'>Rejected</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label='Aadhaar Number'
                    value={aadhaarNumber}
                    onChange={event => {
                      const nextValue = event.target.value.replace(/\D/g, '').slice(0, 12)
                      setAadhaarNumber(nextValue)
                      setFieldErrors(previous => {
                        const next = { ...previous }
                        delete next.aadhaar_number

                        return next
                      })
                    }}
                    error={Boolean(fieldErrors.aadhaar_number)}
                    helperText={fieldErrors.aadhaar_number || 'Enter 12 digits'}
                    inputProps={{ maxLength: 12, inputMode: 'numeric' }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label='PAN Number'
                    value={panNumber}
                    onChange={event => {
                      const nextValue = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
                      setPanNumber(nextValue)
                      setFieldErrors(previous => {
                        const next = { ...previous }
                        delete next.pan_number

                        return next
                      })
                    }}
                    error={Boolean(fieldErrors.pan_number)}
                    helperText={fieldErrors.pan_number || 'Format: AAAAA9999A'}
                    inputProps={{ maxLength: 10 }}
                  />
                </Grid>
              </Grid>

              <Typography variant='h5'>Files & Photo</Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <Stack spacing={1.5}>
                    <TextField
                      fullWidth
                      label='Customer Photo'
                      placeholder='Selected photo filename or stored file path'
                      value={photo}
                      error={Boolean(fieldErrors.photo)}
                      helperText={fieldErrors.photo || 'Allowed: JPG, JPEG, PNG'}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position='end'>
                            <Button component='label' variant='contained' size='small' sx={{ whiteSpace: 'nowrap' }}>
                              Browse
                              <input
                                hidden
                                type='file'
                                accept='.jpg,.jpeg,.png'
                                  onChange={event =>
                                  handleFileSelect(event, setPhoto, setPhotoPreview, setPendingPhotoFile, photoPreview, {
                                    allowedExtensions: ['jpg', 'jpeg', 'png'],
                                    errorMessage: 'Photo must be a JPG, JPEG, or PNG file.',
                                    fieldKey: 'photo'
                                  })
                                }
                              />
                            </Button>
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiInputBase-input.Mui-readOnly': {
                          cursor: 'not-allowed'
                        }
                      }}
                    />
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.5}>
                    <TextField
                      fullWidth
                      label='Aadhaar File'
                      placeholder='Selected file name or stored file path'
                      value={aadhaarFile}
                      error={Boolean(fieldErrors.aadhaar_file)}
                      helperText={fieldErrors.aadhaar_file || 'Allowed: PDF only'}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position='end'>
                            <Button component='label' variant='contained' size='small' sx={{ whiteSpace: 'nowrap' }}>
                              Browse
                              <input
                                hidden
                                type='file'
                                accept='.pdf'
                                  onChange={event =>
                                  handleFileSelect(event, setAadhaarFile, setAadhaarPreview, setPendingAadhaarFile, aadhaarPreview, {
                                    allowedExtensions: ['pdf'],
                                    errorMessage: 'Aadhaar file must be a PDF.',
                                    fieldKey: 'aadhaar_file'
                                  })
                                }
                              />
                            </Button>
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiInputBase-input.Mui-readOnly': {
                          cursor: 'not-allowed'
                        }
                      }}
                    />
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1.5}>
                    <TextField
                      fullWidth
                      label='PAN File'
                      placeholder='Selected file name or stored file path'
                      value={panFile}
                      error={Boolean(fieldErrors.pan_file)}
                      helperText={fieldErrors.pan_file || 'Allowed: PDF only'}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position='end'>
                            <Button component='label' variant='contained' size='small' sx={{ whiteSpace: 'nowrap' }}>
                              Browse
                              <input
                                hidden
                                type='file'
                                accept='.pdf'
                                  onChange={event =>
                                  handleFileSelect(event, setPanFile, setPanPreview, setPendingPanFile, panPreview, {
                                    allowedExtensions: ['pdf'],
                                    errorMessage: 'PAN file must be a PDF.',
                                    fieldKey: 'pan_file'
                                  })
                                }
                              />
                            </Button>
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiInputBase-input.Mui-readOnly': {
                          cursor: 'not-allowed'
                        }
                      }}
                    />
                  </Stack>
                </Grid>
              </Grid>

              <Typography variant='h5'>Location Details</Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label='Address'
                    value={address}
                    onChange={event => setAddress(event.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label='City' value={city} onChange={event => setCity(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label='State' value={stateName} onChange={event => setStateName(event.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label='Pincode' value={pincode} onChange={event => setPincode(event.target.value)} />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                multiline
                minRows={3}
                label='Remarks'
                placeholder='Verification notes or rejection reason'
                value={remarks}
                onChange={event => setRemarks(event.target.value)}
              />

              <Stack direction='row' justifyContent='flex-end' spacing={2}>
                <Button variant='outlined' color='secondary' onClick={() => router.push(`/customers/${customer.id}`)}>
                  Cancel
                </Button>
                <Button variant='contained' onClick={() => void handleSubmit()} disabled={saving}>
                  {saving ? 'Saving...' : 'Save KYC Details'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Stack spacing={6}>
          <FilePreviewCard title='Photo Preview' value={photo} previewUrl={photoPreview} />
          <FilePreviewCard title='Aadhaar Preview' value={aadhaarFile} previewUrl={aadhaarPreview} />
          <FilePreviewCard title='PAN Preview' value={panFile} previewUrl={panPreview} />

          <Card>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant='h5'>What saves here</Typography>
                <Typography variant='body2' color='text.secondary'>
                  This page updates the `customer_kycs` record including identity numbers, file references, photo, address, city,
                  state, pincode, status, and remarks.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  )
}

export default CustomerKycUpdatePage
