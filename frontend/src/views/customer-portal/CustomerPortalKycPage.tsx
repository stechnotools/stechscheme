'use client'

import { type ChangeEvent, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { customerPortalRequest, resolveBackendApiUrl } from '@/libs/customerPortal'

type KycData = {
  aadhaar_number?: string | null
  pan_number?: string | null
  aadhaar_file?: string | null
  pan_file?: string | null
  photo?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  status?: string | null
  remarks?: string | null
  nominee_name?: string | null
  nominee_relation?: string | null
  nominee_mobile_1?: string | null
}

type ProfileResponse = {
  data: {
    id: number
    kyc?: KycData | null
  }
}

const getBackendOrigin = () => resolveBackendApiUrl().replace(/\/api$/, '')

const resolvePreviewUrl = (value?: string | null) => {
  if (!value) return ''
  if (/^(blob:|data:|https?:\/\/)/i.test(value)) return value

  return `${getBackendOrigin()}${value.startsWith('/') ? value : `/${value}`}`
}

const getFileExtension = (value?: string | null) => {
  if (!value) return ''

  return (value.split('?')[0] || value).split('.').pop()?.toLowerCase() || ''
}

const isImageFile = (value?: string | null) => ['jpg', 'jpeg', 'png'].includes(getFileExtension(value))
const isPdfFile = (value?: string | null) => getFileExtension(value) === 'pdf'

const statusColor = (status?: string | null) =>
  status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warning'

const FileField = ({
  label,
  helperText,
  accept,
  currentValue,
  previewUrl,
  onFileSelected
}: {
  label: string
  helperText: string
  accept: string
  currentValue: string
  previewUrl: string
  onFileSelected: (file: File) => void
}) => (
  <Stack spacing={1.5}>
    <TextField
      fullWidth
      size='small'
      label={label}
      value={currentValue}
      helperText={helperText}
      InputProps={{
        readOnly: true,
        endAdornment: (
          <InputAdornment position='end'>
            <Button component='label' variant='contained' size='small'>
              Browse
              <input
                hidden
                type='file'
                accept={accept}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const file = event.target.files?.[0]
                  if (file) onFileSelected(file)
                  event.target.value = ''
                }}
              />
            </Button>
          </InputAdornment>
        )
      }}
    />
    {previewUrl && isImageFile(previewUrl || currentValue) ? (
      <Box component='img' src={previewUrl} alt={label} sx={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 2 }} />
    ) : null}
    {previewUrl && isPdfFile(previewUrl || currentValue) ? (
      <Box component='iframe' src={previewUrl} title={label} sx={{ width: '100%', height: 200, borderRadius: 2, border: '1px solid', borderColor: 'divider' }} />
    ) : null}
  </Stack>
)

const CustomerPortalKycPage = () => {
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const [aadhaarNumber, setAadhaarNumber] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [stateName, setStateName] = useState('')
  const [pincode, setPincode] = useState('')
  const [remarks, setRemarks] = useState('')

  const [nomineeName, setNomineeName] = useState('')
  const [nomineeRelation, setNomineeRelation] = useState('')
  const [nomineeMobile, setNomineeMobile] = useState('')

  const [photoPath, setPhotoPath] = useState('')
  const [aadhaarFilePath, setAadhaarFilePath] = useState('')
  const [panFilePath, setPanFilePath] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [aadhaarPreview, setAadhaarPreview] = useState('')
  const [panPreview, setPanPreview] = useState('')
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [pendingAadhaar, setPendingAadhaar] = useState<File | null>(null)
  const [pendingPan, setPendingPan] = useState<File | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await customerPortalRequest<ProfileResponse>('/customer-portal/profile')
        const kyc = response.data.kyc

        setCustomerId(response.data.id)
        setStatus(kyc?.status || null)
        setAadhaarNumber(kyc?.aadhaar_number || '')
        setPanNumber(kyc?.pan_number || '')
        setAddress(kyc?.address || '')
        setCity(kyc?.city || '')
        setStateName(kyc?.state || '')
        setPincode(kyc?.pincode || '')
        setRemarks(kyc?.remarks || '')
        setNomineeName(kyc?.nominee_name || '')
        setNomineeRelation(kyc?.nominee_relation || '')
        setNomineeMobile(kyc?.nominee_mobile_1 || '')
        setPhotoPath(kyc?.photo || '')
        setAadhaarFilePath(kyc?.aadhaar_file || '')
        setPanFilePath(kyc?.pan_file || '')
        setPhotoPreview(resolvePreviewUrl(kyc?.photo))
        setAadhaarPreview(resolvePreviewUrl(kyc?.aadhaar_file))
        setPanPreview(resolvePreviewUrl(kyc?.pan_file))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load your KYC details.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const handleSubmit = async () => {
    if (!customerId) return

    if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber)) {
      setError('Aadhaar number must be exactly 12 digits.')
      return
    }

    if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) {
      setError('PAN number must be in format AAAAA9999A.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()

      formData.append('customer_id', String(customerId))
      if (aadhaarNumber.trim()) formData.append('aadhaar_number', aadhaarNumber.trim())
      if (panNumber.trim()) formData.append('pan_number', panNumber.trim())
      if (address.trim()) formData.append('address', address.trim())
      if (city.trim()) formData.append('city', city.trim())
      if (stateName.trim()) formData.append('state', stateName.trim())
      if (pincode.trim()) formData.append('pincode', pincode.trim())
      if (remarks.trim()) formData.append('remarks', remarks.trim())
      if (nomineeName.trim()) formData.append('nominee_name', nomineeName.trim())
      if (nomineeRelation.trim()) formData.append('nominee_relation', nomineeRelation.trim())
      if (nomineeMobile.trim()) formData.append('nominee_mobile_1', nomineeMobile.trim())

      if (pendingPhoto) formData.append('photo', pendingPhoto)
      else if (photoPath) formData.append('existing_photo', photoPath)

      if (pendingAadhaar) formData.append('aadhaar_file', pendingAadhaar)
      else if (aadhaarFilePath) formData.append('existing_aadhaar_file', aadhaarFilePath)

      if (pendingPan) formData.append('pan_file', pendingPan)
      else if (panFilePath) formData.append('existing_pan_file', panFilePath)

      const response = await customerPortalRequest<{ message: string; data: KycData }>('/customer-portal/kyc', {
        method: 'POST',
        body: formData
      })

      setSuccess(response.message)
      setStatus(response.data.status || 'pending')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit KYC.')
    } finally {
      setSaving(false)
    }
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
        <Card sx={{ color: 'common.white', background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 45%, #0f766e 100%)' }}>
          <CardContent>
            <Stack direction='row' justifyContent='space-between' alignItems='center'>
              <div>
                <Typography variant='h6'>My KYC</Typography>
                <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Submit or update your identity documents.
                </Typography>
              </div>
              <Chip label={status || 'Not submitted'} color={statusColor(status)} sx={{ textTransform: 'capitalize' }} />
            </Stack>
          </CardContent>
        </Card>

        {error ? <Alert severity='error'>{error}</Alert> : null}
        {success ? <Alert severity='success'>{success}</Alert> : null}

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Identity Numbers
              </Typography>
              <TextField
                fullWidth
                size='small'
                label='Aadhaar Number'
                value={aadhaarNumber}
                onChange={event => setAadhaarNumber(event.target.value.replace(/\D/g, '').slice(0, 12))}
                helperText='Enter 12 digits'
                inputProps={{ maxLength: 12, inputMode: 'numeric' }}
              />
              <TextField
                fullWidth
                size='small'
                label='PAN Number'
                value={panNumber}
                onChange={event => setPanNumber(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                helperText='Format: AAAAA9999A'
                inputProps={{ maxLength: 10 }}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Documents & Photo
              </Typography>
              <FileField
                label='My Photo'
                helperText='Allowed: JPG, JPEG, PNG'
                accept='.jpg,.jpeg,.png'
                currentValue={photoPath}
                previewUrl={photoPreview}
                onFileSelected={file => {
                  if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
                  setPendingPhoto(file)
                  setPhotoPath(file.name)
                  setPhotoPreview(URL.createObjectURL(file))
                }}
              />
              <FileField
                label='Aadhaar File'
                helperText='Allowed: PDF only'
                accept='.pdf'
                currentValue={aadhaarFilePath}
                previewUrl={aadhaarPreview}
                onFileSelected={file => {
                  if (aadhaarPreview.startsWith('blob:')) URL.revokeObjectURL(aadhaarPreview)
                  setPendingAadhaar(file)
                  setAadhaarFilePath(file.name)
                  setAadhaarPreview(URL.createObjectURL(file))
                }}
              />
              <FileField
                label='PAN File'
                helperText='Allowed: PDF only'
                accept='.pdf'
                currentValue={panFilePath}
                previewUrl={panPreview}
                onFileSelected={file => {
                  if (panPreview.startsWith('blob:')) URL.revokeObjectURL(panPreview)
                  setPendingPan(file)
                  setPanFilePath(file.name)
                  setPanPreview(URL.createObjectURL(file))
                }}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Address
              </Typography>
              <TextField fullWidth size='small' multiline minRows={2} label='Address' value={address} onChange={event => setAddress(event.target.value)} />
              <TextField fullWidth size='small' label='City' value={city} onChange={event => setCity(event.target.value)} />
              <TextField fullWidth size='small' label='State' value={stateName} onChange={event => setStateName(event.target.value)} />
              <TextField fullWidth size='small' label='Pincode' value={pincode} onChange={event => setPincode(event.target.value)} />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Nominee Details
              </Typography>
              <TextField fullWidth size='small' label='Nominee Name' value={nomineeName} onChange={event => setNomineeName(event.target.value)} />
              <TextField fullWidth size='small' label='Relation' value={nomineeRelation} onChange={event => setNomineeRelation(event.target.value)} />
              <TextField fullWidth size='small' label='Nominee Mobile' value={nomineeMobile} onChange={event => setNomineeMobile(event.target.value.replace(/\D/g, '').slice(0, 15))} />
            </Stack>
          </CardContent>
        </Card>

        <Button variant='contained' size='large' onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? 'Submitting...' : 'Submit KYC'}
        </Button>
      </Stack>
    </Box>
  )
}

export default CustomerPortalKycPage
