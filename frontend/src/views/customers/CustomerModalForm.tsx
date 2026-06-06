'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useSession } from 'next-auth/react'

type CreateCustomerResponse = {
  data: {
    id: number
    user_id?: number | null
  }
}

type BranchOption = {
  id: number
  name: string
  code: string
}

type BranchesResponse = {
  data: BranchOption[]
}

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

interface CustomerModalFormProps {
  onSuccess?: (customerId: number) => void
  onCancel?: () => void
  fullFields?: boolean
}

export interface CustomerModalFormHandle {
  submit: () => Promise<void>
}

export const CustomerModalForm = forwardRef<CustomerModalFormHandle, CustomerModalFormProps>(
  ({ onSuccess, onCancel, fullFields = false }, ref) => {
    const { data: session } = useSession()
    const accessToken = (session as { accessToken?: string } | null)?.accessToken

    // Basic Details
    const [name, setName] = useState('')
    const [mobile, setMobile] = useState('')
    const [email, setEmail] = useState('')
    const [branchId, setBranchId] = useState('')
    const [portalPassword, setPortalPassword] = useState('123456')
    const [status, setStatus] = useState<'active' | 'inactive' | 'blocked'>('active')
    const [feedback, setFeedback] = useState('')

    // Address
    const [blockNo, setBlockNo] = useState('')
    const [buildingName, setBuildingName] = useState('')
    const [address, setAddress] = useState('')
    const [area, setArea] = useState('')
    const [city, setCity] = useState('')
    const [stateName, setStateName] = useState('')
    const [pincode, setPincode] = useState('')
    const [country, setCountry] = useState('')

    const [branches, setBranches] = useState<BranchOption[]>([])
    const [loadingBranches, setLoadingBranches] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

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
            'Content-Type': 'application/json',
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
      if (!accessToken) return

      const loadBranches = async () => {
        setLoadingBranches(true)

        try {
          const response = await request<BranchesResponse>('/branches?per_page=200&sort_by=name&sort_direction=asc')
          setBranches(response.data)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load branches.')
        } finally {
          setLoadingBranches(false)
        }
      }

      void loadBranches()
    }, [accessToken, request])

    const handleSubmit = async () => {
      if (!mobile.trim()) {
        setError('Mobile number is required.')
        return
      }

      if (!branchId) {
        setError('Please choose a branch.')
        return
      }

      if (fullFields && !portalPassword.trim()) {
        setError('Portal Password is required.')
        return
      }

      setSaving(true)
      setError(null)

      try {
        const customerResponse = await request<CreateCustomerResponse>('/customers', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim() || null,
            mobile: mobile.trim(),
            email: email.trim() || null,
            status,
            portal_enabled: true,
            portal_password: portalPassword,
            branch_id: Number(branchId),
            feedback: feedback.trim() || null,
            kyc: {
              family_head: null,
              birth_date: null,
              anniversary: null,
              spouse_name: null,
              child_name_1: null,
              child_1_birth_date: null,
              child_name_2: null,
              child_2_birth_date: null,
              mobile_no_2: null,
              std_code: null,
              phone_no_1: null,
              phone_no_2: null,
              phone_no_3: null,
              phone_no_4: null,
              phone_no_5: null,
              fax_no_1: null,
              fax_no_2: null,
              email_2: null,
              block_no: blockNo.trim() || null,
              building_name: buildingName.trim() || null,
              address: address.trim() || null,
              area: area.trim() || null,
              city: city.trim() || null,
              state: stateName.trim() || null,
              pincode: pincode.trim() || null,
              country: country.trim() || null,
              aadhaar_number: null,
              pan_number: null,
              driving_licence: null,
              election_card: null,
              passport_no: null,
              nominee_name: null,
              nominee_relation: null,
              nominee_mobile_1: null,
              nominee_mobile_2: null,
              nominee_block_no: null,
              nominee_building_name: null,
              nominee_street: null,
              nominee_area: null,
              nominee_city: null,
              nominee_state: null,
              nominee_zip_code: null,
              nominee_country: null,
              reference_1: null,
              reference_2: null,
              remarks: null
            }
          })
        })

        const customerId = customerResponse.data.id

        if (onSuccess) {
          onSuccess(customerId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create customer.')
      } finally {
        setSaving(false)
      }
    }

    useImperativeHandle(ref, () => ({
      submit: handleSubmit
    }))

    return (
      <Grid container spacing={4}>
        <Grid size={{ xs: 12 }}>
          <Stack spacing={4}>
            {error ? <Alert severity='error'>{error}</Alert> : null}

            {/* Basic Details */}
            <Card elevation={0} variant='outlined'>
              <CardContent>
                <Stack spacing={3}>
                  <Typography variant='h5'>Basic & Login Details</Typography>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label='Customer Name' placeholder='Customer full name' value={name} onChange={e => setName(e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label='Mobile Number' placeholder='9876543210' value={mobile} onChange={e => setMobile(e.target.value)} required />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth type='email' label='Email Address' placeholder='customer@example.com' value={email} onChange={e => setEmail(e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField select fullWidth label='Choose Branch' value={branchId} onChange={e => setBranchId(e.target.value)} disabled={loadingBranches} required>
                        {branches.map(branch => (
                          <MenuItem key={branch.id} value={branch.id}>
                            {`${branch.name} • ${branch.code}`}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    {fullFields && (
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth type='password' label='Portal Password' placeholder='Enter portal password' value={portalPassword} onChange={e => setPortalPassword(e.target.value)} required />
                      </Grid>
                    )}
                    {fullFields && (
                      <>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField select fullWidth label='Customer Status' value={status} onChange={e => setStatus(e.target.value as 'active' | 'inactive' | 'blocked')} required>
                            <MenuItem value='active'>Active</MenuItem>
                            <MenuItem value='inactive'>Inactive</MenuItem>
                            <MenuItem value='blocked'>Blocked</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <TextField fullWidth multiline minRows={3} label='Initial Feedback / Notes' placeholder='Record first customer interaction notes...' value={feedback} onChange={e => setFeedback(e.target.value)} />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </Stack>
              </CardContent>
            </Card>

            {/* Address Info */}
            <Card elevation={0} variant='outlined'>
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

            <Stack direction='row' justifyContent='flex-end' spacing={2}>
              <Button variant='outlined' onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
              <Button variant='contained' onClick={() => void handleSubmit()} disabled={saving || loadingBranches} size='large'>
                {saving ? 'Saving...' : 'Save Customer'}
              </Button>
            </Stack>
          </Stack>
        </Grid>
      </Grid>
    )
  }
)

CustomerModalForm.displayName = 'CustomerModalForm'
