'use client'

import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import { getCustomerName, resolveBackendApiUrl, type CustomerResponse } from './customerData'

const EditCustomerSkeleton = () => (
  <Grid container spacing={6}>
    <Grid size={{ xs: 12 }}>
      <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 1 }} />
    </Grid>
    <Grid size={{ xs: 12, lg: 8 }}>
      <Stack spacing={4}>
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i}>
            <CardContent>
              <Stack spacing={3}>
                <Skeleton variant='text' width='40%' height={32} />
                <Grid container spacing={3}>
                  {[1, 2, 3, 4].map(j => (
                    <Grid key={j} size={{ xs: 12, md: 6 }}>
                      <Skeleton variant='rectangular' height={56} sx={{ borderRadius: 1 }} />
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Grid>
    <Grid size={{ xs: 12, lg: 4 }}>
      <Stack spacing={6}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Skeleton variant='text' width='60%' height={32} />
              <Stack spacing={4}>
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} variant='rectangular' height={120} sx={{ borderRadius: 1 }} />
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Skeleton variant='text' width='80%' height={32} />
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i}>
                  <Skeleton variant='text' width='30%' />
                  <Skeleton variant='text' width='60%' height={24} />
                </div>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Grid>
  </Grid>
)

type BranchOption = {
  id: number
  name: string
  code: string
}

type BranchesResponse = {
  data: BranchOption[]
}

const getFileExtension = (filename: string) => filename.split('.').pop()?.toLowerCase() || ''
const isPdfFile = (filename: string) => getFileExtension(filename) === 'pdf'

const FileUploadSection = ({
  label,
  accept,
  onFileSelect,
  previewUrl,
  fileName,
  error
}: {
  label: string
  accept: string
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void
  previewUrl: string | null
  fileName: string | null
  error?: string
}) => {
  const isPdf = fileName && isPdfFile(fileName)

  return (
    <Stack spacing={1.5}>
      <Typography variant='subtitle2' color='text.secondary'>{label}</Typography>
      <Box
        sx={{
          p: 3,
          border: '1px dashed',
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: 1,
          bgcolor: 'action.hover',
          textAlign: 'center',
          position: 'relative',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            bgcolor: 'action.selected',
            borderColor: 'primary.main'
          }
        }}
      >
        <input
          type='file'
          accept={accept}
          onChange={onFileSelect}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            zIndex: 2
          }}
        />
        {previewUrl ? (
          <Stack spacing={2} alignItems='center'>
            {isPdf ? (
              <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <i className='ri-file-pdf-line' style={{ fontSize: 32, color: '#f44336' }} />
                <Typography variant='caption' display='block' sx={{ mt: 1, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fileName}
                </Typography>
              </Box>
            ) : (
              <Box
                component='img'
                src={previewUrl}
                sx={{ width: 80, height: 80, borderRadius: 1, objectFit: 'cover', border: '1px solid', borderColor: 'divider' }}
              />
            )}
            <Typography variant='caption' color='primary' sx={{ fontWeight: 600 }}>Change File</Typography>
          </Stack>
        ) : (
          <Stack spacing={1} alignItems='center'>
            <i className='ri-upload-2-line' style={{ fontSize: 24, color: 'var(--mui-palette-text-secondary)' }} />
            <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 500 }}>
              Upload {label}
            </Typography>
          </Stack>
        )}
      </Box>
      {error && <Typography variant='caption' color='error' sx={{ mt: 0.5 }}>{error}</Typography>}
    </Stack>
  )
}

const EditCustomerPage = ({ customerId }: { customerId: number }) => {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  // Basic Details
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [portalPassword, setPortalPassword] = useState('')
  const [branchId, setBranchId] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'blocked'>('active')
  const [feedback, setFeedback] = useState('')

  // Personal Info
  const [familyHead, setFamilyHead] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [anniversary, setAnniversary] = useState('')
  const [spouseName, setSpouseName] = useState('')
  const [childName1, setChildName1] = useState('')
  const [child1BirthDate, setChild1BirthDate] = useState('')
  const [childName2, setChildName2] = useState('')
  const [child2BirthDate, setChild2BirthDate] = useState('')

  // Contact Info
  const [mobileNo2, setMobileNo2] = useState('')
  const [stdCode, setStdCode] = useState('')
  const [phoneNo1, setPhoneNo1] = useState('')
  const [phoneNo2, setPhoneNo2] = useState('')
  const [phoneNo3, setPhoneNo3] = useState('')
  const [phoneNo4, setPhoneNo4] = useState('')
  const [phoneNo5, setPhoneNo5] = useState('')
  const [faxNo1, setFaxNo1] = useState('')
  const [faxNo2, setFaxNo2] = useState('')
  const [email2, setEmail2] = useState('')

  // Address
  const [blockNo, setBlockNo] = useState('')
  const [buildingName, setBuildingName] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [city, setCity] = useState('')
  const [stateName, setStateName] = useState('')
  const [pincode, setPincode] = useState('')
  const [country, setCountry] = useState('')

  // Identity & Verification
  const [aadhaarNumber, setAadhaarNumber] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [drivingLicence, setDrivingLicence] = useState('')
  const [electionCard, setElectionCard] = useState('')
  const [passportNo, setPassportNo] = useState('')

  // File Uploads
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [pendingAadhaarFile, setPendingAadhaarFile] = useState<File | null>(null)
  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null)
  const [pendingPanFile, setPendingPanFile] = useState<File | null>(null)
  const [panPreview, setPanPreview] = useState<string | null>(null)

  // Nominee Details
  const [nomineeName, setNomineeName] = useState('')
  const [nomineeRelation, setNomineeRelation] = useState('')
  const [nomineeMobile1, setNomineeMobile1] = useState('')
  const [nomineeMobile2, setNomineeMobile2] = useState('')
  const [nomineeBlockNo, setNomineeBlockNo] = useState('')
  const [nomineeBuildingName, setNomineeBuildingName] = useState('')
  const [nomineeStreet, setNomineeStreet] = useState('')
  const [nomineeArea, setNomineeArea] = useState('')
  const [nomineeCity, setNomineeCity] = useState('')
  const [nomineeZipCode, setNomineeZipCode] = useState('')
  const [nomineeState, setNomineeState] = useState('')
  const [nomineeCountry, setNomineeCountry] = useState('')

  // References
  const [reference1, setReference1] = useState('')
  const [reference2, setReference2] = useState('')
  const [remarks, setRemarks] = useState('')

  const [branches, setBranches] = useState<BranchOption[]>([])
  const [customer, setCustomer] = useState<CustomerResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

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
          ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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
    return () => {
      if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
      if (aadhaarPreview?.startsWith('blob:')) URL.revokeObjectURL(aadhaarPreview)
      if (panPreview?.startsWith('blob:')) URL.revokeObjectURL(panPreview)
    }
  }, [photoPreview, aadhaarPreview, panPreview])

  useEffect(() => {
    if (sessionStatus === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')
      return
    }

    if (sessionStatus !== 'authenticated') return

    const loadCustomer = async () => {
      setLoading(true)
      setError(null)

      try {
        const [customerResponse, branchResponse] = await Promise.all([
          request<CustomerResponse>(`/customers/${customerId}`),
          request<BranchesResponse>('/branches?per_page=200&sort_by=name&sort_direction=asc')
        ])

        const data = customerResponse.data
        const kyc = data.kyc

        setBranches(branchResponse.data)
        setCustomer(data)
        
        // Basic
        setName(data.name || '')
        setMobile(data.mobile || '')
        setEmail(data.email || '')
        setStatus((data.status as 'active' | 'inactive' | 'blocked' | null) || 'active')
        setFeedback(data.feedback || '')
        setBranchId(data.user?.branches?.[0]?.id ? String(data.user.branches[0].id) : '')

        // KYC fields
        if (kyc) {
          setFamilyHead(kyc.family_head || '')
          setBirthDate(kyc.birth_date || '')
          setAnniversary(kyc.anniversary || '')
          setSpouseName(kyc.spouse_name || '')
          setChildName1(kyc.child_name_1 || '')
          setChild1BirthDate(kyc.child_1_birth_date || '')
          setChildName2(kyc.child_name_2 || '')
          setChild2BirthDate(kyc.child_2_birth_date || '')
          
          setMobileNo2(kyc.mobile_no_2 || '')
          setStdCode(kyc.std_code || '')
          setPhoneNo1(kyc.phone_no_1 || '')
          setPhoneNo2(kyc.phone_no_2 || '')
          setPhoneNo3(kyc.phone_no_3 || '')
          setPhoneNo4(kyc.phone_no_4 || '')
          setPhoneNo5(kyc.phone_no_5 || '')
          setFaxNo1(kyc.fax_no_1 || '')
          setFaxNo2(kyc.fax_no_2 || '')
          setEmail2(kyc.email_2 || '')

          setBlockNo(kyc.block_no || '')
          setBuildingName(kyc.building_name || '')
          setAddress(kyc.address || '')
          setArea(kyc.area || '')
          setCity(kyc.city || '')
          setStateName(kyc.state || '')
          setPincode(kyc.pincode || '')
          setCountry(kyc.country || '')

          setAadhaarNumber(kyc.aadhaar_number || '')
          setPanNumber(kyc.pan_number || '')
          setDrivingLicence(kyc.driving_licence || '')
          setElectionCard(kyc.election_card || '')
          setPassportNo(kyc.passport_no || '')

          setNomineeName(kyc.nominee_name || '')
          setNomineeRelation(kyc.nominee_relation || '')
          setNomineeMobile1(kyc.nominee_mobile_1 || '')
          setNomineeMobile2(kyc.nominee_mobile_2 || '')
          setNomineeBlockNo(kyc.nominee_block_no || '')
          setNomineeBuildingName(kyc.nominee_building_name || '')
          setNomineeStreet(kyc.nominee_street || '')
          setNomineeArea(kyc.nominee_area || '')
          setNomineeCity(kyc.nominee_city || '')
          setNomineeState(kyc.nominee_state || '')
          setNomineeZipCode(kyc.nominee_zip_code || '')
          setNomineeCountry(kyc.nominee_country || '')

          setReference1(kyc.reference_1 || '')
          setReference2(kyc.reference_2 || '')
          setRemarks(kyc.remarks || '')

          // Files
          if (kyc.photo) setPhotoPreview(kyc.photo)
          if (kyc.aadhaar_file) setAadhaarPreview(kyc.aadhaar_file)
          if (kyc.pan_file) setPanPreview(kyc.pan_file)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customer.')
      } finally {
        setLoading(false)
      }
    }

    void loadCustomer()
  }, [sessionStatus, accessToken, customerId, request])

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void,
    setPreview: (url: string | null) => void,
    fieldKey: string,
    allowedTypes: string[]
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    const ext = getFileExtension(file.name)
    if (!allowedTypes.includes(ext)) {
      setFieldErrors(prev => ({ ...prev, [fieldKey]: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` }))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors(prev => ({ ...prev, [fieldKey]: 'File size too large (max 5MB)' }))
      return
    }

    setFieldErrors(prev => {
      const next = { ...prev }
      delete next[fieldKey]
      return next
    })

    setFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!mobile.trim()) {
      setError('Mobile number is required.')
      return
    }

    if (!branchId) {
      setError('Please choose a branch.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // 1. Update basic and kyc data
      await request(`/customers/${customerId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim() || null,
          mobile: mobile.trim(),
          email: email.trim() || null,
          status,
          branch_id: Number(branchId),
          feedback: feedback.trim() || null,
          ...(portalPassword.trim() ? { portal_password: portalPassword.trim() } : {}),
          kyc: {
            family_head: familyHead.trim() || null,
            birth_date: birthDate || null,
            anniversary: anniversary || null,
            spouse_name: spouseName.trim() || null,
            child_name_1: childName1.trim() || null,
            child_1_birth_date: child1BirthDate || null,
            child_name_2: childName2.trim() || null,
            child_2_birth_date: child2BirthDate || null,
            mobile_no_2: mobileNo2.trim() || null,
            std_code: stdCode.trim() || null,
            phone_no_1: phoneNo1.trim() || null,
            phone_no_2: phoneNo2.trim() || null,
            phone_no_3: phoneNo3.trim() || null,
            phone_no_4: phoneNo4.trim() || null,
            phone_no_5: phoneNo5.trim() || null,
            fax_no_1: faxNo1.trim() || null,
            fax_no_2: faxNo2.trim() || null,
            email_2: email2.trim() || null,
            block_no: blockNo.trim() || null,
            building_name: buildingName.trim() || null,
            address: address.trim() || null,
            area: area.trim() || null,
            city: city.trim() || null,
            state: stateName.trim() || null,
            pincode: pincode.trim() || null,
            country: country.trim() || null,
            aadhaar_number: aadhaarNumber.trim() || null,
            pan_number: panNumber.trim().toUpperCase() || null,
            driving_licence: drivingLicence.trim() || null,
            election_card: electionCard.trim() || null,
            passport_no: passportNo.trim() || null,
            nominee_name: nomineeName.trim() || null,
            nominee_relation: nomineeRelation.trim() || null,
            nominee_mobile_1: nomineeMobile1.trim() || null,
            nominee_mobile_2: nomineeMobile2.trim() || null,
            nominee_block_no: nomineeBlockNo.trim() || null,
            nominee_building_name: nomineeBuildingName.trim() || null,
            nominee_street: nomineeStreet.trim() || null,
            nominee_area: nomineeArea.trim() || null,
            nominee_city: nomineeCity.trim() || null,
            nominee_state: nomineeState.trim() || null,
            nominee_zip_code: nomineeZipCode.trim() || null,
            nominee_country: nomineeCountry.trim() || null,
            reference_1: reference1.trim() || null,
            reference_2: reference2.trim() || null,
            remarks: remarks.trim() || null
          }
        })
      })

      // 2. Upload new files if any
      if (pendingPhotoFile || pendingAadhaarFile || pendingPanFile) {
        const formData = new FormData()
        formData.append('customer_id', String(customerId))
        if (pendingPhotoFile) formData.append('photo', pendingPhotoFile)
        if (pendingAadhaarFile) formData.append('aadhaar_file', pendingAadhaarFile)
        if (pendingPanFile) formData.append('pan_file', pendingPanFile)
        
        // Include existing paths to prevent deletion if not changing
        if (!pendingPhotoFile && customer?.kyc?.photo) formData.append('existing_photo', customer.kyc.photo)
        if (!pendingAadhaarFile && customer?.kyc?.aadhaar_file) formData.append('existing_aadhaar_file', customer.kyc.aadhaar_file)
        if (!pendingPanFile && customer?.kyc?.pan_file) formData.append('existing_pan_file', customer.kyc.pan_file)

        await request('/kycs', {
          method: 'POST',
          body: formData
        })
      }

      setSuccess('Customer updated successfully.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => router.push(`/customers/${customerId}`), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  const activeMemberships = customer?.memberships?.filter(membership => membership.status === 'active') || []
  const totalPaid = customer?.memberships?.reduce((sum, membership) => sum + Number(membership.total_paid || 0), 0) || 0
  const currentBranch = branches.find(branch => String(branch.id) === branchId)?.name || customer?.user?.branches?.[0]?.name || 'Not assigned'
  const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  })

  if (loading) {
    return <EditCustomerSkeleton />
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card
          sx={{
            color: 'common.white',
            background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #0891b2 100%)'
          }}
        >
          <CardContent sx={{ p: { xs: 5, md: 6 } }}>
            <Stack spacing={2}>
              <Chip
                label='Customer Edit'
                sx={{
                  alignSelf: 'flex-start',
                  bgcolor: 'rgba(255,255,255,0.12)',
                  color: 'common.white'
                }}
              />
              <Typography variant='h4' sx={{ color: 'common.white' }}>
                Update {getCustomerName({ id: customerId, name, mobile, email, status })}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 760 }}>
                Maintain accurate customer profiles, verify documents, and ensure contact details are updated for seamless scheme management.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Stack spacing={4}>
          {error ? <Alert severity='error'>{error}</Alert> : null}
          {success ? <Alert severity='success'>{success}</Alert> : null}

          {/* Basic Details */}
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Typography variant='h5'>Basic & Login Details</Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Customer Name' value={name} onChange={e => setName(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Mobile Number' value={mobile} onChange={e => setMobile(e.target.value)} required />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth type='email' label='Email Address' value={email} onChange={e => setEmail(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField 
                      fullWidth 
                      type='password' 
                      label='New Portal Password' 
                      placeholder='Leave blank to keep current' 
                      value={portalPassword} 
                      onChange={e => setPortalPassword(e.target.value)} 
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField select fullWidth label='Choose Branch' value={branchId} onChange={e => setBranchId(e.target.value)} required>
                      {branches.map(branch => (
                        <MenuItem key={branch.id} value={branch.id}>
                          {`${branch.name} • ${branch.code}`}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField select fullWidth label='Customer Status' value={status} onChange={e => setStatus(e.target.value as typeof status)}>
                      <MenuItem value='active'>Active</MenuItem>
                      <MenuItem value='inactive'>Inactive</MenuItem>
                      <MenuItem value='blocked'>Blocked</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth multiline minRows={3} label='Initial Feedback / Notes' placeholder='Update feedback collected at onboarding' value={feedback} onChange={e => setFeedback(e.target.value)} />
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Typography variant='h5'>Personal Information</Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Family Head' value={familyHead} onChange={e => setFamilyHead(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Spouse Name' value={spouseName} onChange={e => setSpouseName(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth type='date' label='Birth Date' value={birthDate} onChange={e => setBirthDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth type='date' label='Anniversary Date' value={anniversary} onChange={e => setAnniversary(e.target.value)} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  
                  <Grid size={{ xs: 12 }}><Divider sx={{ my: 1 }} /></Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Child 1 Name' value={childName1} onChange={e => setChildName1(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth type='date' label='Child 1 Birth Date' value={child1BirthDate} onChange={e => setChild1BirthDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Child 2 Name' value={childName2} onChange={e => setChildName2(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth type='date' label='Child 2 Birth Date' value={child2BirthDate} onChange={e => setChild2BirthDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>

          {/* Address Details */}
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Typography variant='h5'>Address Details</Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Block No' value={blockNo} onChange={e => setBlockNo(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Building Name' value={buildingName} onChange={e => setBuildingName(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth multiline minRows={2} label='Address / Street' value={address} onChange={e => setAddress(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Area' value={area} onChange={e => setArea(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='City' value={city} onChange={e => setCity(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label='State' value={stateName} onChange={e => setStateName(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label='Pincode' value={pincode} onChange={e => setPincode(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label='Country' value={country} onChange={e => setCountry(e.target.value)} />
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Typography variant='h5'>Additional Contact Information</Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Alternate Mobile No 2' value={mobileNo2} onChange={e => setMobileNo2(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth type='email' label='Alternate Email 2' value={email2} onChange={e => setEmail2(e.target.value)} />
                  </Grid>
                  
                  <Grid size={{ xs: 12 }}><Divider sx={{ my: 1 }} /></Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label='STD Code' value={stdCode} onChange={e => setStdCode(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label='Phone No 1' value={phoneNo1} onChange={e => setPhoneNo1(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label='Phone No 2' value={phoneNo2} onChange={e => setPhoneNo2(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label='Phone No 3' value={phoneNo3} onChange={e => setPhoneNo3(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label='Phone No 4' value={phoneNo4} onChange={e => setPhoneNo4(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label='Phone No 5' value={phoneNo5} onChange={e => setPhoneNo5(e.target.value)} />
                  </Grid>

                  <Grid size={{ xs: 12 }}><Divider sx={{ my: 1 }} /></Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Fax No 1' value={faxNo1} onChange={e => setFaxNo1(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Fax No 2' value={faxNo2} onChange={e => setFaxNo2(e.target.value)} />
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>

          {/* Identity Info */}
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Typography variant='h5'>Identity & Verification</Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Aadhaar Number' value={aadhaarNumber} onChange={e => setAadhaarNumber(e.target.value)} inputProps={{ maxLength: 12 }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='PAN Number' value={panNumber} onChange={e => setPanNumber(e.target.value.toUpperCase())} inputProps={{ maxLength: 10 }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Driving Licence' value={drivingLicence} onChange={e => setDrivingLicence(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Election Card' value={electionCard} onChange={e => setElectionCard(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Passport Number' value={passportNo} onChange={e => setPassportNo(e.target.value)} />
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>

          {/* Nominee Details */}
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Typography variant='h5'>Nominee Details</Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Nominee Name' value={nomineeName} onChange={e => setNomineeName(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Relation' value={nomineeRelation} onChange={e => setNomineeRelation(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Nominee Mobile 1' value={nomineeMobile1} onChange={e => setNomineeMobile1(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Nominee Mobile 2' value={nomineeMobile2} onChange={e => setNomineeMobile2(e.target.value)} />
                  </Grid>

                  <Grid size={{ xs: 12 }}><Divider sx={{ my: 1 }} /></Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Block No' value={nomineeBlockNo} onChange={e => setNomineeBlockNo(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Building Name' value={nomineeBuildingName} onChange={e => setNomineeBuildingName(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label='Street' value={nomineeStreet} onChange={e => setNomineeStreet(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Area' value={nomineeArea} onChange={e => setNomineeArea(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='City' value={nomineeCity} onChange={e => setCity(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label='State' value={nomineeState} onChange={e => setNomineeState(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label='Zip Code' value={nomineeZipCode} onChange={e => setNomineeZipCode(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label='Country' value={nomineeCountry} onChange={e => setNomineeCountry(e.target.value)} />
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>

          {/* References & Remarks */}
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Typography variant='h5'>References & Remarks</Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Reference 1' value={reference1} onChange={e => setReference1(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label='Reference 2' value={reference2} onChange={e => setReference2(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth multiline minRows={3} label='Remarks / Notes' value={remarks} onChange={e => setRemarks(e.target.value)} />
                  </Grid>
                </Grid>

                <Stack direction='row' justifyContent='flex-end' spacing={2} sx={{ mt: 2 }}>
                  <Button variant='outlined' color='secondary' onClick={() => router.push(`/customers/${customerId}`)}>
                    Cancel
                  </Button>
                  <Button variant='contained' onClick={() => void handleSubmit()} disabled={saving} size='large'>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Stack spacing={6} sx={{ position: 'sticky', top: 24 }}>
          {/* Document Uploads Card */}
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Typography variant='h5'>KYC Documents</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Update or replace verification documents. Max file size: 5MB per file.
                </Typography>
                <Stack spacing={4}>
                  <FileUploadSection
                    label='Customer Photo'
                    accept='.jpg,.jpeg,.png'
                    onFileSelect={e => handleFileChange(e, setPendingPhotoFile, setPhotoPreview, 'photo', ['jpg', 'jpeg', 'png'])}
                    previewUrl={photoPreview}
                    fileName={pendingPhotoFile?.name || customer?.kyc?.photo || null}
                    error={fieldErrors.photo}
                  />
                  <FileUploadSection
                    label='Aadhaar Document (PDF)'
                    accept='.pdf'
                    onFileSelect={e => handleFileChange(e, setPendingAadhaarFile, setAadhaarPreview, 'aadhaar_file', ['pdf'])}
                    previewUrl={aadhaarPreview}
                    fileName={pendingAadhaarFile?.name || customer?.kyc?.aadhaar_file || null}
                    error={fieldErrors.aadhaar_file}
                  />
                  <FileUploadSection
                    label='PAN Document (PDF)'
                    accept='.pdf'
                    onFileSelect={e => handleFileChange(e, setPendingPanFile, setPanPreview, 'pan_file', ['pdf'])}
                    previewUrl={panPreview}
                    fileName={pendingPanFile?.name || customer?.kyc?.pan_file || null}
                    error={fieldErrors.pan_file}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Customer Snapshot */}
          <Card sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Stack spacing={2.5}>
                <div>
                  <Typography variant='h5'>Customer Snapshot</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Quick reference while editing.
                  </Typography>
                </div>

                <div>
                  <Typography variant='body2' color='text.secondary'>Current branch</Typography>
                  <Typography fontWeight={700}>{currentBranch}</Typography>
                </div>

                <div>
                  <Typography variant='body2' color='text.secondary'>Portal login mobile</Typography>
                  <Typography fontWeight={700}>{customer?.user?.mobile || mobile || '-'}</Typography>
                </div>

                <div>
                  <Typography variant='body2' color='text.secondary'>KYC status</Typography>
                  <Typography fontWeight={700} sx={{ textTransform: 'capitalize' }}>{customer?.kyc?.status || 'pending'}</Typography>
                </div>

                <div>
                  <Typography variant='body2' color='text.secondary'>Active memberships</Typography>
                  <Typography fontWeight={700}>{activeMemberships.length}</Typography>
                </div>

                <div>
                  <Typography variant='body2' color='text.secondary'>Total paid</Typography>
                  <Typography fontWeight={700}>{currencyFormatter.format(totalPaid)}</Typography>
                </div>

                <Button variant='outlined' onClick={() => router.push(`/customers/${customerId}`)} fullWidth>
                  View Full Profile
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  )
}

export default EditCustomerPage
