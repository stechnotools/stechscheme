'use client'

import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import DirectionalIcon from '@components/DirectionalIcon'
import StepperCustomDot from '@components/stepper-dot'
import StepperWrapper from '@core/styles/stepper'

type SchemeOption = {
  id: number
  name: string
  code: string
  total_installments?: number | null
  installment_value?: string | number | null
  scheme_type?: string | null
  is_closed?: boolean
}

type BranchOption = {
  id: number
  name: string
  code: string
  city?: string | null
}

type SalesmanOption = {
  id: number
  name: string
  mobile?: string | null
  status?: string | null
  roles?: Array<{ name?: string | null }> | string[]
  branches?: Array<{ id: number; name: string }>
}

type CustomerLookup = {
  id: number
  name?: string | null
  mobile: string
  email?: string | null
  status?: string | null
  kyc?: {
    aadhaar_number?: string | null
    pan_number?: string | null
    aadhaar_file?: string | null
    pan_file?: string | null
    photo?: string | null
    status?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    pincode?: string | null
    remarks?: string | null
  } | null
  memberships?: Array<{
    id: number
    membership_no?: string | null
    status: string
    maturity_date: string
    scheme?: {
      name: string
      code: string
      installment_value?: string | number | null
    } | null
  }>
}

type SchemesResponse = { data: SchemeOption[] }
type BranchesResponse = { data: BranchOption[] }
type UsersResponse = { data: SalesmanOption[] }
type CustomersResponse = { data: Array<{ id: number; mobile: string }> }
type CustomerResponse = { data: CustomerLookup }

const steps = [
  { title: 'Scheme', subtitle: 'Choose the membership plan', iconClass: 'ri-vip-diamond-line' },
  { title: 'Customer Details', subtitle: 'Find and review customer', iconClass: 'ri-user-3-line' },
  { title: 'Branch Agreement', subtitle: 'Assign branch and confirm', iconClass: 'ri-building-line' },
  { title: 'Billing Details', subtitle: 'Confirm amount and billing', iconClass: 'ri-money-rupee-circle-line' },
  { title: 'Payment Confirmation', subtitle: 'Collect and confirm payment', iconClass: 'ri-bank-card-line' }
] as const

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const getBackendOrigin = () => resolveBackendApiUrl().replace(/\/api$/, '')

const resolvePreviewUrl = (value?: string | null) => {
  if (!value) return ''

  if (/^(blob:|data:|https?:\/\/)/i.test(value)) {
    return value
  }

  const normalizedValue = value.startsWith('/') ? value : `/${value}`

  return `${getBackendOrigin()}${normalizedValue}`
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const getFileExtension = (value?: string | null) => {
  if (!value) return ''

  const sanitizedValue = value.split('?')[0] || value
  const extension = sanitizedValue.split('.').pop()

  return extension?.toLowerCase() || ''
}

const isImageFile = (value?: string | null) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(getFileExtension(value))
const isPdfFile = (value?: string | null) => getFileExtension(value) === 'pdf'

const sectionCardSx = {
  borderRadius: 3,
  borderColor: 'divider',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)'
} as const

const canPreviewImage = (preview?: string | null, name?: string | null) => {
  if (!preview) return false
  if (preview.startsWith('blob:')) return isImageFile(name)
  if (preview.startsWith('data:image/')) return true

  return isImageFile(preview) || isImageFile(name)
}

const canPreviewPdf = (preview?: string | null, name?: string | null) => {
  if (!preview) return false
  if (preview.startsWith('blob:')) return isPdfFile(name)
  if (preview.startsWith('data:application/pdf')) return true

  return isPdfFile(preview) || isPdfFile(name)
}

const splitAddressParts = (address?: string | null) => {
  const source = address?.trim() || ''

  if (!source) {
    return {
      doorNo: '',
      street: '',
      locality: ''
    }
  }

  const parts = source
    .split(/[\n,]+/)
    .map(part => part.trim())
    .filter(Boolean)

  return {
    doorNo: parts[0] || source,
    street: parts[1] || '',
    locality: parts.slice(2).join(', ')
  }
}

const MembershipCreatePage = ({ customerId }: { customerId?: number }) => {
  const { data: session } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [activeStep, setActiveStep] = useState(0)
  const [schemes, setSchemes] = useState<SchemeOption[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [salesmen, setSalesmen] = useState<SalesmanOption[]>([])

  const [mobile, setMobile] = useState('')
  const [lookupDone, setLookupDone] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [existingCustomer, setExistingCustomer] = useState<CustomerLookup | null>(null)

  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [portalPassword, setPortalPassword] = useState('')
  const [doorNo, setDoorNo] = useState('')
  const [street, setStreet] = useState('')
  const [locality, setLocality] = useState('')
  const [city, setCity] = useState('')
  const [stateName, setStateName] = useState('')
  const [pinCode, setPinCode] = useState('')
  const [nomineeName, setNomineeName] = useState('')
  const [nomineeMobile, setNomineeMobile] = useState('')
  const [nomineeEmail, setNomineeEmail] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [aadhaarNumber, setAadhaarNumber] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [aadhaarFileName, setAadhaarFileName] = useState('')
  const [panFileName, setPanFileName] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [aadhaarPreview, setAadhaarPreview] = useState('')
  const [panPreview, setPanPreview] = useState('')
  const [selectedSchemeId, setSelectedSchemeId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [branchId, setBranchId] = useState('')
  const [salesmanId, setSalesmanId] = useState('')
  const [paymentBasis, setPaymentBasis] = useState<'scheme' | 'custom'>('scheme')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [gateway, setGateway] = useState('cash')
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'failed' | 'refunded'>('success')
  const [transactionId, setTransactionId] = useState('')
  const [agreementAccepted, setAgreementAccepted] = useState(false)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any | null>(null)
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [activeDocument, setActiveDocument] = useState<'photo' | 'aadhaar' | 'pan' | null>(null)

  const applyExistingCustomerData = useCallback((customer: CustomerLookup) => {
    const addressParts = splitAddressParts(customer.kyc?.address)

    setExistingCustomer(customer)
    setLookupDone(true)
    setMobile(customer.mobile || '')
    setCustomerName(customer.name || '')
    setEmail(customer.email || '')
    setDoorNo(addressParts.doorNo)
    setStreet(addressParts.street)
    setLocality(addressParts.locality || customer.kyc?.remarks || '')
    setCity(customer.kyc?.city || '')
    setStateName(customer.kyc?.state || '')
    setPinCode(customer.kyc?.pincode || '')
    setAadhaarNumber(customer.kyc?.aadhaar_number || '')
    setPanNumber(customer.kyc?.pan_number || '')
    setPhotoName(customer.kyc?.photo || '')
    setAadhaarFileName(customer.kyc?.aadhaar_file || '')
    setPanFileName(customer.kyc?.pan_file || '')
    setPhotoPreview(resolvePreviewUrl(customer.kyc?.photo))
    setAadhaarPreview(resolvePreviewUrl(customer.kyc?.aadhaar_file))
    setPanPreview(resolvePreviewUrl(customer.kyc?.pan_file))
  }, [])

  const resetCustomerFormForNewCustomer = useCallback((nextMobile: string) => {
    setExistingCustomer(null)
    setLookupDone(true)
    setMobile(nextMobile)
    setCustomerName('')
    setEmail('')
    setPortalPassword('')
    setDoorNo('')
    setStreet('')
    setLocality('')
    setCity('')
    setStateName('')
    setPinCode('')
    setNomineeName('')
    setNomineeMobile('')
    setNomineeEmail('')
    setPanNumber('')
    setAadhaarNumber('')
    setPhotoName('')
    setAadhaarFileName('')
    setPanFileName('')
    setPhotoPreview('')
    setAadhaarPreview('')
    setPanPreview('')
  }, [])

  const request = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    if (!accessToken) throw new Error('Missing access token')

    const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {})
      },
      cache: 'no-store'
    })

    const payload = (await response.json().catch(() => null)) as { message?: string; errors?: Record<string, string[]> } | null

    if (!response.ok) {
      const validationMessage = payload?.errors ? Object.values(payload.errors).flat().join(' ') : null
      throw new Error(validationMessage || payload?.message || 'Request failed')
    }

    return payload as T
  }, [accessToken])

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
      if (aadhaarPreview.startsWith('blob:')) URL.revokeObjectURL(aadhaarPreview)
      if (panPreview.startsWith('blob:')) URL.revokeObjectURL(panPreview)
    }
  }, [aadhaarPreview, panPreview, photoPreview])

  useEffect(() => {
    if (!accessToken) return

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [schemeResponse, branchResponse, userResponse] = await Promise.all([
          request<SchemesResponse>('/schemes?per_page=300&sort_by=created_at&sort_direction=desc'),
          request<BranchesResponse>('/branches?per_page=200&sort_by=name&sort_direction=asc'),
          request<UsersResponse>('/users?per_page=200&sort_by=name&sort_direction=asc')
        ])

        setSchemes(schemeResponse.data.filter(item => !item.is_closed))
        setBranches(branchResponse.data)
        setSalesmen(
          userResponse.data.filter(user => {
            const roleNames = Array.isArray(user.roles)
              ? user.roles.map(role => (typeof role === 'string' ? role : role?.name || ''))
              : []

            return user.status !== 'blocked' && roleNames.some(role => ['super-admin', 'admin', 'staff'].includes(String(role)))
          })
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load SIP data.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [accessToken, request])

  useEffect(() => {
    if (!customerId || !accessToken) return

    void request<CustomerResponse>(`/customers/${customerId}`)
      .then(response => {
        applyExistingCustomerData(response.data)
      })
      .catch(() => {})
  }, [customerId, accessToken, applyExistingCustomerData, request])

  const selectedScheme = useMemo(() => schemes.find(item => item.id === Number(selectedSchemeId)), [schemes, selectedSchemeId])
  const selectedBranch = useMemo(() => branches.find(item => item.id === Number(branchId)), [branches, branchId])
  const filteredSalesmen = useMemo(() => {
    if (!branchId) return salesmen

    return salesmen.filter(user => (user.branches || []).some(branch => branch.id === Number(branchId)))
  }, [branchId, salesmen])
  const selectedSalesman = useMemo(() => filteredSalesmen.find(item => item.id === Number(salesmanId)), [filteredSalesmen, salesmanId])
  const activeDocumentPreview = activeDocument === 'photo' ? photoPreview : activeDocument === 'aadhaar' ? aadhaarPreview : panPreview
  const activeDocumentFileName = activeDocument === 'photo' ? photoName : activeDocument === 'aadhaar' ? aadhaarFileName : panFileName
  const activeDocumentTitle = activeDocument === 'photo' ? 'Photo Preview' : activeDocument === 'aadhaar' ? 'Aadhaar Preview' : 'PAN Preview'

  useEffect(() => {
    if (paymentBasis === 'scheme' && selectedScheme?.installment_value) {
      setPaymentAmount(String(selectedScheme.installment_value))
    }
  }, [paymentBasis, selectedScheme?.installment_value])

  useEffect(() => {
    if (branchId && salesmanId && !filteredSalesmen.some(item => item.id === Number(salesmanId))) {
      setSalesmanId('')
    }
  }, [branchId, salesmanId, filteredSalesmen])

  const stepIsComplete = (step: number) => {
    switch (step) {
      case 0:
        return Boolean(selectedSchemeId)
      case 1:
        return lookupDone && mobile.trim().length > 0
      case 2:
        return agreementAccepted && Boolean(branchId)
      case 3:
        return Number(paymentAmount) > 0
      case 4:
        return Boolean(result)
      default:
        return false
    }
  }

  const handleLookup = async () => {
    if (!mobile.trim()) {
      setError('Enter mobile number first.')

      return
    }

    setLookupLoading(true)
    setError(null)
    setResult(null)

    try {
      const lookupResponse = await request<CustomersResponse>(`/customers?per_page=50&search=${encodeURIComponent(mobile.trim())}`)
      const exactMatch = lookupResponse.data.find(customer => customer.mobile === mobile.trim())

      if (exactMatch) {
        const customerResponse = await request<CustomerResponse>(`/customers/${exactMatch.id}`)
        applyExistingCustomerData(customerResponse.data)
      } else {
        resetCustomerFormForNewCustomer(mobile.trim())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search customer.')
    } finally {
      setLookupLoading(false)
    }
  }

  const handleJoinNow = (schemeId: number) => {
    setSelectedSchemeId(String(schemeId))
    setPaymentBasis('scheme')
  }

  const handleNext = () => {
    setError(null)

    if (activeStep === 0 && !stepIsComplete(0)) {
      setError('Select a scheme before moving to the next section.')

      return
    }

    if (activeStep === 1 && !stepIsComplete(1)) {
      setError('Complete customer lookup before moving to the next section.')

      return
    }

    if (activeStep === 2 && !stepIsComplete(2)) {
      setError('Select branch and accept the agreement before continuing.')

      return
    }

    if (activeStep === 3 && !stepIsComplete(3)) {
      setError('Enter a valid billing amount before continuing.')

      return
    }

    setActiveStep(prev => Math.min(prev + 1, steps.length - 1))
  }

  const handleBack = () => {
    setError(null)
    setActiveStep(prev => Math.max(prev - 1, 0))
  }

  const handleSubmit = async () => {
    if (!lookupDone || !mobile.trim()) {
      setError('Complete mobile lookup first.')

      return
    }

    if (!selectedSchemeId) {
      setError('Select a scheme to join.')

      return
    }

    if (!agreementAccepted) {
      setError('Accept the agreement before continuing to payment.')

      return
    }

    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setError('Enter a valid collection amount.')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await request<{ data: any }>('/memberships/enroll', {
        method: 'POST',
        body: JSON.stringify({
          customer: {
            name: customerName || null,
            mobile: mobile.trim(),
            email: email || null,
            portal_password: portalPassword || null,
            status: 'active'
          },
          scheme_id: Number(selectedSchemeId),
          user_id: salesmanId ? Number(salesmanId) : null,
          branch_id: branchId ? Number(branchId) : null,
          start_date: startDate,
          payment: {
            amount: Number(paymentAmount),
            gateway,
            transaction_id: transactionId || null,
            payment_date: startDate,
            status: paymentStatus
          }
        })
      })

      setResult(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create SIP enrollment.')
    } finally {
      setSaving(false)
    }
  }

  const renderNavigation = () => (
    <Grid size={{ xs: 12 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' spacing={2}>
        <Button
          variant='outlined'
          color='secondary'
          disabled={activeStep === 0}
          onClick={handleBack}
          startIcon={<DirectionalIcon ltrIconClass='ri-arrow-left-line' rtlIconClass='ri-arrow-right-line' />}
        >
          Back
        </Button>

        {activeStep < steps.length - 1 ? (
          <Button
            variant='contained'
            onClick={handleNext}
            endIcon={<DirectionalIcon ltrIconClass='ri-arrow-right-line' rtlIconClass='ri-arrow-left-line' />}
          >
            Next
          </Button>
        ) : (
          <Button variant='contained' onClick={() => void handleSubmit()} disabled={saving || loading}>
            {saving ? 'Accepting Payment...' : 'Accept Payment And Continue'}
          </Button>
        )}
      </Stack>
    </Grid>
  )

  const renderStepContent = () => {
    const handleLocalFileSelect = (
      event: ChangeEvent<HTMLInputElement>,
      setName: (value: string) => void,
      setPreview: (value: string) => void,
      currentPreview: string
    ) => {
      const file = event.target.files?.[0]

      if (!file) return

      if (currentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview)
      }

      setName(file.name)
      setPreview(URL.createObjectURL(file))
      event.target.value = ''
    }

    switch (activeStep) {
      case 0:
        return (
          <>
            <Grid size={{ xs: 12 }}>
              <div>
                <Typography variant='h5'>1. Select Scheme</Typography>
                <Typography color='text.secondary'>Choose the membership scheme first before collecting customer and billing details.</Typography>
              </div>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Grid container spacing={6}>
                <Grid size={{ xs: 12, md: selectedScheme ? 7 : 12 }}>
                  <Grid container spacing={3}>
                    {schemes.map(scheme => {
                      const selected = Number(selectedSchemeId) === scheme.id

                      return (
                        <Grid key={scheme.id} size={{ xs: 12, md: selectedScheme ? 12 : 6, xl: selectedScheme ? 6 : 4 }}>
                          <Card variant='outlined' sx={{ borderColor: selected ? 'primary.main' : 'divider', height: '100%' }}>
                            <CardContent>
                              <Stack spacing={2}>
                                <Stack direction='row' justifyContent='space-between' spacing={2}>
                                  <div>
                                    <Typography variant='h6'>{scheme.name}</Typography>
                                    <Typography color='text.secondary'>{scheme.code} - {scheme.scheme_type || 'scheme'}</Typography>
                                  </div>
                                  {selected ? <Chip label='Selected' color='primary' /> : null}
                                </Stack>

                                <Typography variant='body2' color='text.secondary'>
                                  {scheme.total_installments || 0} installments - {currencyFormatter.format(Number(scheme.installment_value || 0))}
                                </Typography>

                                <Button variant={selected ? 'contained' : 'outlined'} onClick={() => handleJoinNow(scheme.id)}>
                                  {selected ? 'Selected For Membership' : 'Choose Scheme'}
                                </Button>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      )
                    })}
                  </Grid>
                </Grid>

                {selectedScheme && (
                  <Grid size={{ xs: 12, md: 5 }}>
                    <Card sx={{ height: '100%', borderTop: '4px solid', borderColor: 'primary.main', position: 'sticky', top: 20 }}>
                      <CardContent>
                        <Stack spacing={3}>
                          <div>
                            <Typography variant="h5" sx={{ mb: 1 }}>Selected Scheme Details</Typography>
                            <Typography variant="body2" color="text.secondary">Review the full configuration of the scheme.</Typography>
                          </div>
                          
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="body2" color="text.secondary">Scheme Name</Typography>
                              <Typography fontWeight={700}>{selectedScheme.name}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="body2" color="text.secondary">Code</Typography>
                              <Typography fontWeight={700}>{selectedScheme.code}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="body2" color="text.secondary">Total Installments</Typography>
                              <Typography fontWeight={700}>{selectedScheme.total_installments}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="body2" color="text.secondary">Installment Value</Typography>
                              <Typography fontWeight={700}>{currencyFormatter.format(Number(selectedScheme.installment_value || 0))}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="body2" color="text.secondary">Scheme Type</Typography>
                              <Typography fontWeight={700}>{selectedScheme.scheme_type || 'N/A'}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="body2" color="text.secondary">Duration</Typography>
                              <Typography fontWeight={700}>{(selectedScheme as any).installment_duration || 'Monthly'}</Typography>
                            </Grid>
                            
                            <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>Finances & Rules</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="body2" color="text.secondary">Grace Days</Typography>
                              <Typography fontWeight={700}>{(selectedScheme as any).grace_days || 0} days</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="body2" color="text.secondary">Allow Overdue</Typography>
                              <Typography fontWeight={700}>{(selectedScheme as any).allow_overdue ? 'Yes' : 'No'}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                              <Typography variant="body2" color="text.secondary">Maturity Months After Last</Typography>
                              <Typography fontWeight={700}>{(selectedScheme as any).maturity_months_after_last_installment || 0}</Typography>
                            </Grid>

                            <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>Bonus Features</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="body2" color="text.secondary">Allow Bonus</Typography>
                              <Typography fontWeight={700}>{(selectedScheme as any).allow_bonus ? 'Yes' : 'No'}</Typography>
                            </Grid>
                            {(selectedScheme as any).allow_bonus && (
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="body2" color="text.secondary">Bonus Mode</Typography>
                                <Typography fontWeight={700}>{(selectedScheme as any).benefit_type || 'N/A'}</Typography>
                              </Grid>
                            )}
                          </Grid>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Grid>

            {renderNavigation()}
          </>
        )

      case 1:
        return (
          <>
            <Grid size={{ xs: 12 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
                <div>
                  <Typography variant='h5'>2. Customer Details</Typography>
                  <Typography color='text.secondary'>Find an existing customer by mobile number and review their KYC and profile details.</Typography>
                </div>
                {lookupDone ? <Chip label={existingCustomer ? 'Existing Customer Found' : 'New Customer'} color={existingCustomer ? 'success' : 'warning'} /> : null}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <TextField fullWidth label='Mobile Number' value={mobile} onChange={event => setMobile(event.target.value)} placeholder='Enter customer mobile number' />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Button fullWidth variant='contained' onClick={() => void handleLookup()} disabled={lookupLoading || loading} sx={{ height: '100%' }}>
                {lookupLoading ? 'Searching...' : 'Find Customer'}
              </Button>
            </Grid>

            {lookupDone && existingCustomer ? (
              <Grid size={{ xs: 12 }}>
                <Alert severity='success'>
                  Customer found: {existingCustomer.name || 'Unnamed customer'} - {existingCustomer.mobile} - KYC {existingCustomer.kyc?.status || 'pending'}
                </Alert>
              </Grid>
            ) : null}

            {lookupDone && !existingCustomer ? (
              <Grid size={{ xs: 12 }}>
                <Alert severity='info'>No existing customer found for this mobile number. Continue to create a new SIP customer.</Alert>
              </Grid>
            ) : null}

            {lookupDone ? (
              <>
                <Grid size={{ xs: 12 }}>
                  <Card variant='outlined' sx={sectionCardSx}>
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Typography fontWeight={700}>Mobile Details</Typography>
                        <Grid container spacing={3}>
                          <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant='body2' color='text.secondary'>Entered Mobile</Typography>
                            <Typography fontWeight={700}>{mobile || 'Not provided'}</Typography>
                          </Grid>
                          <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant='body2' color='text.secondary'>Lookup Result</Typography>
                            <Typography fontWeight={700}>{existingCustomer ? 'Existing Customer' : 'New Customer'}</Typography>
                          </Grid>
                          <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant='body2' color='text.secondary'>Mobile Match</Typography>
                            <Typography fontWeight={700}>{existingCustomer?.mobile || mobile || 'Not found'}</Typography>
                          </Grid>
                        </Grid>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {existingCustomer ? (
              <Grid size={{ xs: 12 }}>
                <Card variant='outlined' sx={sectionCardSx}>
                  <CardContent>
                    <Stack spacing={2.5}>
                      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
                        <div>
                          <Typography fontWeight={700}>Existing Customer Snapshot</Typography>
                          <Typography variant='body2' color='text.secondary'>
                            Stored customer profile and KYC values fetched from the system.
                          </Typography>
                        </div>
                        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                          <Chip label={`Customer #${existingCustomer.id}`} size='small' variant='outlined' />
                          <Chip label={`KYC ${existingCustomer.kyc?.status || 'pending'}`} size='small' color='primary' variant='tonal' />
                        </Stack>
                      </Stack>

                      <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <Typography variant='body2' color='text.secondary'>Customer Name</Typography>
                          <Typography fontWeight={700}>{existingCustomer.name || 'Unnamed customer'}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <Typography variant='body2' color='text.secondary'>Mobile</Typography>
                          <Typography fontWeight={700}>{existingCustomer.mobile}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <Typography variant='body2' color='text.secondary'>Email</Typography>
                          <Typography fontWeight={700}>{existingCustomer.email || 'Not provided'}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <Typography variant='body2' color='text.secondary'>Proofs Available</Typography>
                          <Typography fontWeight={700}>
                            {[
                              existingCustomer.kyc?.photo ? 'Photo' : '',
                              existingCustomer.kyc?.aadhaar_file ? 'Aadhaar' : '',
                              existingCustomer.kyc?.pan_file ? 'PAN' : ''
                            ].filter(Boolean).join(', ') || 'No files uploaded'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ) : null}

            <Grid size={{ xs: 12 }}>
              <Card variant='outlined' sx={sectionCardSx}>
                <CardContent>
                  <Stack spacing={2.5}>
                    <Typography fontWeight={700}>Customer Photo & Documents</Typography>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Card
                          variant='outlined'
                          sx={{
                            height: '100%',
                            borderRadius: 3,
                            overflow: 'hidden'
                          }}
                        >
                          <CardContent sx={{ p: 2.5 }}>
                            <Stack spacing={1.5} sx={{ height: '100%' }}>
                              <Typography fontWeight={700}>Photo</Typography>
                              <Box
                                onClick={() => {
                                  if (!photoPreview) return
                                  setActiveDocument('photo')
                                  setDocumentsOpen(true)
                                }}
                                sx={{
                                  flex: 1,
                                  minHeight: 260,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: 2,
                                  border: '1px solid var(--mui-palette-divider)',
                                  bgcolor: 'var(--mui-palette-action-hover)',
                                  textAlign: 'center',
                                  px: 2,
                                  cursor: photoPreview ? 'pointer' : 'default',
                                  position: 'relative'
                                }}
                              >
                                {canPreviewImage(photoPreview, photoName) ? (
                                  <Box
                                    component='img'
                                    src={photoPreview || undefined}
                                    alt='Customer photo preview'
                                    sx={{
                                      width: '100%',
                                      height: 240,
                                      objectFit: 'contain'
                                    }}
                                  />
                                ) : (
                                  <Stack spacing={0.5} alignItems='center'>
                                    <Typography fontWeight={700}>Photo</Typography>
                                    <Typography variant='body2' color='text.secondary'>
                                      Click to preview
                                    </Typography>
                                  </Stack>
                                )}
                                {photoPreview ? (
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      inset: 'auto 12px 12px auto',
                                      px: 1,
                                      py: 0.5,
                                      borderRadius: 99,
                                      bgcolor: 'rgba(15, 23, 42, 0.72)',
                                      color: 'common.white'
                                    }}
                                  >
                                    <Typography variant='caption'>Preview</Typography>
                                  </Box>
                                ) : null}
                              </Box>
                              <Button component='label' variant='outlined' fullWidth>
                                Browse
                                <input
                                  hidden
                                  type='file'
                                  accept='.jpg,.jpeg,.png'
                                  onChange={event => handleLocalFileSelect(event, setPhotoName, setPhotoPreview, photoPreview)}
                                />
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, md: 8 }}>
                        <Stack spacing={2.5}>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }}>
                              <Card variant='outlined' sx={{ borderRadius: 3 }}>
                                <CardContent sx={{ p: 2 }}>
                                  <Grid container spacing={2} alignItems='stretch'>
                                    <Grid size={{ xs: 12, sm: 8, md: 9 }}>
                                      <Stack spacing={1.25}>
                                        <TextField
                                          fullWidth
                                          label='Aadhaar No'
                                          value={aadhaarNumber}
                                          onChange={event => setAadhaarNumber(event.target.value)}
                                        />
                                        <Button component='label' variant='outlined' fullWidth>
                                          Browse
                                          <input
                                            hidden
                                            type='file'
                                            accept='.pdf,.jpg,.jpeg,.png'
                                            onChange={event => handleLocalFileSelect(event, setAadhaarFileName, setAadhaarPreview, aadhaarPreview)}
                                          />
                                        </Button>
                                      </Stack>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                                      <Stack spacing={1}>
                                        <Box
                                          sx={{
                                            height: '100%',
                                            minHeight: 140,
                                            borderRadius: 2,
                                            border: '1px solid var(--mui-palette-divider)',
                                            borderRadius: 'var(--mui-shape-borderRadius)',
                                            bgcolor: 'var(--mui-palette-action-hover)',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                        >
                                          {aadhaarPreview ? (
                                            canPreviewImage(aadhaarPreview, aadhaarFileName) ? (
                                              <Box
                                                component='img'
                                                src={aadhaarPreview || undefined}
                                                alt='Aadhaar thumbnail'
                                                sx={{
                                                  width: '100%',
                                                  height: 140,
                                                  objectFit: 'cover',
                                                  bgcolor: 'common.white'
                                                }}
                                              />
                                            ) : (
                                              <Box
                                                component='iframe'
                                                src={aadhaarPreview || undefined}
                                                title='Aadhaar thumbnail'
                                                sx={{
                                                  width: '100%',
                                                  height: 140,
                                                  border: 0,
                                                  bgcolor: 'common.white'
                                                }}
                                              />
                                            )
                                          ) : (
                                            <Typography variant='body2' color='text.secondary'>No Preview</Typography>
                                          )}
                                        </Box>
                                        <Button
                                          variant='outlined'
                                          size='small'
                                          disabled={!aadhaarPreview}
                                          onClick={() => {
                                            setActiveDocument('aadhaar')
                                            setDocumentsOpen(true)
                                          }}
                                        >
                                          Preview
                                        </Button>
                                      </Stack>
                                    </Grid>
                                  </Grid>
                                </CardContent>
                              </Card>
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                              <Card variant='outlined' sx={{ borderRadius: 3 }}>
                                <CardContent sx={{ p: 2 }}>
                                  <Grid container spacing={2} alignItems='stretch'>
                                    <Grid size={{ xs: 12, sm: 8, md: 9 }}>
                                      <Stack spacing={1.25}>
                                        <TextField
                                          fullWidth
                                          label='PAN No'
                                          value={panNumber}
                                          onChange={event => setPanNumber(event.target.value)}
                                        />
                                        <Button component='label' variant='outlined' fullWidth>
                                          Browse
                                          <input
                                            hidden
                                            type='file'
                                            accept='.pdf,.png,.jpg,.jpeg'
                                            onChange={event => handleLocalFileSelect(event, setPanFileName, setPanPreview, panPreview)}
                                          />
                                        </Button>
                                      </Stack>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                                      <Stack spacing={1}>
                                        <Box
                                          sx={{
                                            height: '100%',
                                            minHeight: 140,
                                            borderRadius: 2,
                                            border: '1px solid var(--mui-palette-divider)',
                                            borderRadius: 'var(--mui-shape-borderRadius)',
                                            bgcolor: 'var(--mui-palette-action-hover)',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}
                                        >
                                          {panPreview ? (
                                            canPreviewImage(panPreview, panFileName) ? (
                                              <Box
                                                component='img'
                                                src={panPreview || undefined}
                                                alt='PAN thumbnail'
                                                sx={{
                                                  width: '100%',
                                                  height: 140,
                                                  objectFit: 'cover',
                                                  bgcolor: 'common.white'
                                                }}
                                              />
                                            ) : (
                                              <Box
                                                component='iframe'
                                                src={panPreview || undefined}
                                                title='PAN thumbnail'
                                                sx={{
                                                  width: '100%',
                                                  height: 140,
                                                  border: 0,
                                                  bgcolor: 'common.white'
                                                }}
                                              />
                                            )
                                          ) : (
                                            <Typography variant='body2' color='text.secondary'>No Preview</Typography>
                                          )}
                                        </Box>
                                        <Button
                                          variant='outlined'
                                          size='small'
                                          disabled={!panPreview}
                                          onClick={() => {
                                            setActiveDocument('pan')
                                            setDocumentsOpen(true)
                                          }}
                                        >
                                          Preview
                                        </Button>
                                      </Stack>
                                    </Grid>
                                  </Grid>
                                </CardContent>
                              </Card>
                            </Grid>
                          </Grid>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Card variant='outlined' sx={sectionCardSx}>
                <CardContent>
                  <Stack spacing={2.5}>
                    <Typography fontWeight={700}>Basic Details</Typography>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth label='Name' value={customerName} onChange={event => setCustomerName(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth label='Mobile Number' value={mobile} onChange={event => setMobile(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth type='email' label='Email' value={email} onChange={event => setEmail(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          type='password'
                          label='Portal Password'
                          value={portalPassword}
                          onChange={event => setPortalPassword(event.target.value)}
                          helperText={existingCustomer ? 'Optional. Leave blank to keep existing customer password.' : 'Optional. If blank, the system will use the mobile number as default.'}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth label='KYC Status' value={existingCustomer?.kyc?.status || 'pending'} disabled />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          label='KYC Remarks'
                          value={existingCustomer?.kyc?.remarks || ''}
                          placeholder='No KYC remarks available'
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Card variant='outlined' sx={sectionCardSx}>
                <CardContent>
                  <Stack spacing={2.5}>
                    <Typography fontWeight={700}>Address</Typography>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth label='Door No.' value={doorNo} onChange={event => setDoorNo(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth label='Street' value={street} onChange={event => setStreet(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth label='Area / Locality' value={locality} onChange={event => setLocality(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth label='PIN Code' value={pinCode} onChange={event => setPinCode(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth label='City' value={city} onChange={event => setCity(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth label='State' value={stateName} onChange={event => setStateName(event.target.value)} />
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Card variant='outlined' sx={sectionCardSx}>
                <CardContent>
                  <Stack spacing={2.5}>
                    <Typography fontWeight={700}>Nominee Details</Typography>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth label='Nominee Name' value={nomineeName} onChange={event => setNomineeName(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth label='Nominee Mobile Number' value={nomineeMobile} onChange={event => setNomineeMobile(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField fullWidth type='email' label='Nominee Email' value={nomineeEmail} onChange={event => setNomineeEmail(event.target.value)} />
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
              </>
            ) : null}

            {renderNavigation()}
          </>
        )

      case 2:
        return (
          <>
            <Grid size={{ xs: 12 }}>
              <div>
                <Typography variant='h5'>3. Branch Agreement</Typography>
                <Typography color='text.secondary'>Assign branch and salesman, then confirm agreement acceptance before billing.</Typography>
              </div>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label='Branch' value={branchId} onChange={event => setBranchId(event.target.value)}>
                {branches.map(branch => (
                  <MenuItem key={branch.id} value={branch.id}>
                    {`${branch.name} - ${branch.code}`}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label='Salesman' value={salesmanId} onChange={event => setSalesmanId(event.target.value)}>
                {filteredSalesmen.map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    {`${user.name} - ${user.mobile || 'No mobile'}`}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth type='date' label='Start Date' value={startDate} onChange={event => setStartDate(event.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Card variant='outlined'>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography fontWeight={700}>Agreement Document</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Customer agrees to the membership terms, payment schedule, maturity rules, and enrollment conditions.
                    </Typography>
                    <FormControlLabel
                      control={<Checkbox checked={agreementAccepted} onChange={event => setAgreementAccepted(event.target.checked)} />}
                      label='I confirm that the customer accepted the agreement document and wants to continue.'
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {renderNavigation()}
          </>
        )

      case 3:
        return (
          <>
            <Grid size={{ xs: 12 }}>
              <div>
                <Typography variant='h5'>4. Billing Details</Typography>
                <Typography color='text.secondary'>Choose the billing basis and confirm the amount to be collected for this membership.</Typography>
              </div>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label='Amount Basis' value={paymentBasis} onChange={event => setPaymentBasis(event.target.value as typeof paymentBasis)}>
                <MenuItem value='scheme'>Use Installment Amount</MenuItem>
                <MenuItem value='custom'>Enter Custom Amount</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label='Collection Amount'
                value={paymentAmount}
                onChange={event => setPaymentAmount(event.target.value)}
                disabled={paymentBasis === 'scheme'}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label='Installment Amount' value={Number(selectedScheme?.installment_value || 0).toLocaleString('en-IN')} disabled />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Card variant='outlined'>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography fontWeight={700}>Billing Summary</Typography>
                    <Typography variant='body2' color='text.secondary'>Customer: {customerName || 'New customer'} - {mobile || 'No mobile'}</Typography>
                    <Typography variant='body2' color='text.secondary'>Scheme: {selectedScheme?.name || '-'} - {selectedScheme?.code || '-'}</Typography>
                    <Typography variant='body2' color='text.secondary'>Billing amount: {currencyFormatter.format(Number(paymentAmount || 0))}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {renderNavigation()}
          </>
        )

      case 4:
        return (
          <>
            <Grid size={{ xs: 12 }}>
              <div>
                <Typography variant='h5'>5. Payment Confirmation</Typography>
                <Typography color='text.secondary'>Choose the payment option, confirm the transaction details, and complete the membership enrollment.</Typography>
              </div>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label='Payment Option' value={gateway} onChange={event => setGateway(event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label='Payment Status' value={paymentStatus} onChange={event => setPaymentStatus(event.target.value as typeof paymentStatus)}>
                <MenuItem value='success'>Success</MenuItem>
                <MenuItem value='pending'>Pending</MenuItem>
                <MenuItem value='failed'>Failed</MenuItem>
                <MenuItem value='refunded'>Refunded</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label='Transaction Reference' value={transactionId} onChange={event => setTransactionId(event.target.value)} />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant='outlined'>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography fontWeight={700}>Selected SIP Summary</Typography>
                    <Typography variant='body2' color='text.secondary'>Customer: {customerName || 'New customer'} - {mobile}</Typography>
                    <Typography variant='body2' color='text.secondary'>Scheme: {selectedScheme?.name || '-'} - {selectedScheme?.code || '-'}</Typography>
                    <Typography variant='body2' color='text.secondary'>Branch: {selectedBranch ? `${selectedBranch.name} - ${selectedBranch.code}` : 'Not selected'}</Typography>
                    <Typography variant='body2' color='text.secondary'>Salesman: {selectedSalesman?.name || 'Not selected'}</Typography>
                    <Typography variant='body2' color='text.secondary'>Pay now: {currencyFormatter.format(Number(paymentAmount || 0))}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Stack justifyContent='center' sx={{ height: '100%' }}>
                <Alert severity='info'>Review the SIP summary and submit from this final step.</Alert>
              </Stack>
            </Grid>

            {renderNavigation()}
          </>
        )

      default:
        return null
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stack spacing={4}>
              <div>
                <Typography variant='h4'>Create SIP</Typography>
                <Typography color='text.secondary'>
                  Start with the customer mobile number, review existing plans, choose a scheme, confirm branch details, and accept payment in one guided wizard.
                </Typography>
              </div>

              <StepperWrapper>
                <Stepper activeStep={activeStep} alternativeLabel>
                  {steps.map((step, index) => (
                    <Step key={step.title} completed={stepIsComplete(index)}>
                      <StepLabel
                        slots={{
                          stepIcon: StepperCustomDot
                        }}
                      >
                        <div className='step-label'>
                          <Stack spacing={0.5} alignItems='center'>
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: index === activeStep || stepIsComplete(index) ? 'primary.main' : 'action.selected',
                                color: index === activeStep || stepIsComplete(index) ? 'primary.contrastText' : 'text.secondary'
                              }}
                            >
                              <i className={step.iconClass} />
                            </Box>
                            <div>
                              <Typography className='step-title'>{step.title}</Typography>
                              <Typography className='step-subtitle'>{step.subtitle}</Typography>
                            </div>
                          </Stack>
                        </div>
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </StepperWrapper>

              {error ? <Alert severity='error'>{error}</Alert> : null}
              {loading ? <Alert severity='info'>Loading SIP setup data...</Alert> : null}

              <Card variant='outlined'>
                <CardContent>
                  <Grid container spacing={5}>
                    {renderStepContent()}
                  </Grid>
                </CardContent>
              </Card>

              {result ? (
                <Card variant='outlined' sx={{ borderColor: 'success.main', backgroundColor: 'rgba(34,197,94,0.04)' }}>
                  <CardContent>
                    <Stack spacing={2.5}>
                      <div>
                        <Typography variant='h5'>SIP Created Successfully</Typography>
                        <Typography color='text.secondary'>
                          Customer #{result.customer?.id} - Membership {result.membership?.membership_no} - Card {result.card?.card_no}
                        </Typography>
                      </div>

                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <Typography color='text.secondary'>Branch</Typography>
                          <Typography fontWeight={700}>{result.summary?.selected_branch?.name || selectedBranch?.name || '-'}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <Typography color='text.secondary'>Salesman</Typography>
                          <Typography fontWeight={700}>{result.summary?.selected_salesman?.name || selectedSalesman?.name || '-'}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <Typography color='text.secondary'>Payment</Typography>
                          <Typography fontWeight={700}>
                            {result.payment ? `${currencyFormatter.format(Number(result.payment.amount || 0))} - ${result.payment.status}` : 'No payment'}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                          <Typography color='text.secondary'>Maturity Date</Typography>
                          <Typography fontWeight={700}>{result.summary?.maturity_date || '-'}</Typography>
                        </Grid>
                      </Grid>

                      <Alert severity='success'>
                        Customer portal login mobile: {result.summary?.portal_login_mobile || mobile}. {portalPassword ? 'Use the entered password.' : 'Default password is the mobile number for newly created customer records.'}
                      </Alert>
                    </Stack>
                  </CardContent>
                </Card>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Dialog
        open={documentsOpen}
        onClose={() => {
          setDocumentsOpen(false)
          setActiveDocument(null)
        }}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{activeDocumentTitle}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Card variant='outlined'>
              <CardContent sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Typography fontWeight={700}>{activeDocumentTitle}</Typography>
                  {canPreviewImage(activeDocumentPreview, activeDocumentFileName) ? (
                    <Box component='img' src={activeDocumentPreview || undefined} alt={activeDocumentTitle} sx={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 2 }} />
                  ) : canPreviewPdf(activeDocumentPreview, activeDocumentFileName) ? (
                    <Box component='iframe' src={activeDocumentPreview || undefined} title={activeDocumentTitle} sx={{ width: '100%', height: 420, border: 0, borderRadius: 2 }} />
                  ) : (
                    <Box sx={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 2 }}>
                      <Typography variant='body2' color='text.secondary'>No document selected</Typography>
                    </Box>
                  )}
                  <Typography variant='body2' color='text.secondary' sx={{ wordBreak: 'break-all' }}>
                    {activeDocumentFileName || 'No document selected'}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>
      </Dialog>
    </Grid>
  )
}

export default MembershipCreatePage
