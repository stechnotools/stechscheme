'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRef } from 'react'
import type { ChangeEvent } from 'react'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

type Company = {
  id?: number
  name: string
  email?: string | null
  phone?: string | null
  logo?: string | null
}

type CompanyProfileSettings = {
  address: string
  owner_name: string
  gst_no: string
  pan_no: string
}

type SettingsResponse = {
  data?: {
    section: string
    value: Partial<CompanyProfileSettings>
  }
}

type UploadLogoResponse = {
  data?: {
    logo?: string
  }
}

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const initialProfile: CompanyProfileSettings = {
  address: '',
  owner_name: '',
  gst_no: '',
  pan_no: ''
}

const CompanyInfoSettings = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken
  const sessionCompany = (session as { backendUser?: { company?: Company | null } } | null)?.backendUser?.company ?? null

  const [company, setCompany] = useState<Company>({ name: '', email: '', phone: '', logo: '' })
  const [profile, setProfile] = useState<CompanyProfileSettings>(initialProfile)
  const [companyId, setCompanyId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const saveInProgressRef = useRef(false)

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!accessToken) {
        throw new Error('Missing access token')
      }

      if (path === '/settings/company-logo' && !saveInProgressRef.current) {
        throw new Error('Logo upload is allowed only after clicking Save Changes.')
      }

      const response = await fetch(`${backendApiUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
          ...(init?.headers || {})
        }
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(payload?.message || 'Request failed')
      }

      return payload as T
    },
    [accessToken]
  )

  const loadData = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      const sessionCompanyId = sessionCompany?.id ?? null

      if (sessionCompanyId) {
        const companyResponse = await request<{ data: Company }>(`/companies/${sessionCompanyId}`)
        const currentCompany = companyResponse.data

        setCompanyId(currentCompany.id ?? null)
        setCompany({
          name: currentCompany.name || '',
          email: currentCompany.email || '',
          phone: currentCompany.phone || '',
          logo: currentCompany.logo || ''
        })
      }

      const settings = await request<SettingsResponse>('/settings/company-profile')
      const value = settings.data?.value || {}

      setProfile({
        address: value.address || '',
        owner_name: value.owner_name || '',
        gst_no: value.gst_no || '',
        pan_no: value.pan_no || ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load company info.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, request, sessionCompany?.id])

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl)
      }
    }
  }, [logoPreviewUrl])

  useEffect(() => {
    if (status === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')
      return
    }

    if (status === 'authenticated') {
      void loadData()
    }
  }, [status, accessToken, loadData])

  const handleSave = async () => {
    if (!company.name.trim()) {
      setError('Company name is required.')
      return
    }

    if (!company.phone?.trim()) {
      setError('Mobile number is required.')
      return
    }

    setSaving(true)
    saveInProgressRef.current = true
    setError(null)
    setSuccess(null)

    try {
      let finalLogo = company.logo || null

      if (pendingLogoFile) {
        const formData = new FormData()
        formData.append('logo', pendingLogoFile)

        const uploadResponse = await request<UploadLogoResponse>('/settings/company-logo', {
          method: 'POST',
          body: formData
        })

        const uploadedLogo = uploadResponse.data?.logo || null

        if (uploadedLogo) {
          finalLogo = uploadedLogo
          setCompany(prev => ({ ...prev, logo: uploadedLogo }))
        }
      }

      const companyPayload = {
        name: company.name,
        email: company.email || null,
        phone: company.phone || null,
        logo: finalLogo
      }

      let finalCompanyId = companyId

      if (companyId) {
        await request(`/companies/${companyId}`, {
          method: 'PUT',
          body: JSON.stringify(companyPayload)
        })
      } else {
        const created = await request<{ data: Company }>('/companies', {
          method: 'POST',
          body: JSON.stringify(companyPayload)
        })

        finalCompanyId = created.data.id ?? null
        setCompanyId(finalCompanyId)
      }

      await request('/settings/company-profile', {
        method: 'PUT',
        body: JSON.stringify({
          value: {
            address: profile.address,
            owner_name: profile.owner_name,
            gst_no: profile.gst_no,
            pan_no: profile.pan_no,
            company_id: finalCompanyId
          }
        })
      })

      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl)
      }
      setPendingLogoFile(null)
      setLogoPreviewUrl(null)

      setSuccess('Company info updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save company info.')
    } finally {
      setSaving(false)
      saveInProgressRef.current = false
    }
  }

  const handleResetLogo = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault()

    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl)
    }
    setPendingLogoFile(null)
    setLogoPreviewUrl(null)
    setCompany(prev => ({ ...prev, logo: '' }))
  }

  const handleBrowseLogo = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault()
    logoInputRef.current?.click()
  }

  const handleLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    setError(null)
    setSuccess(null)

    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl)
    }

    setPendingLogoFile(file)
    setLogoPreviewUrl(URL.createObjectURL(file))
    setSuccess('Logo preview updated. Not uploaded yet. Click Save Changes to upload.')

    if (logoInputRef.current) {
      logoInputRef.current.value = ''
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}
        {success ? <Alert severity='success' className={error ? 'mt-3' : ''}>{success}</Alert> : null}
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='mbe-5'>
            <div className='flex max-sm:flex-col items-center gap-6'>
              <img
                height={100}
                width={100}
                className='rounded object-cover border'
                src={logoPreviewUrl || company.logo?.trim() || '/images/avatars/1.png'}
                alt='Company Logo'
              />
              <div className='flex grow flex-col gap-4'>
                <div className='flex flex-col sm:flex-row gap-4'>
                  <input
                    ref={logoInputRef}
                    type='file'
                    accept='image/png,image/jpeg,image/webp'
                    className='hidden'
                    onChange={handleLogoFileChange}
                  />
                  <Button type='button' variant='contained' onClick={handleBrowseLogo} disabled={loading || saving}>
                    Browse
                  </Button>
                  <Button type='button' variant='outlined' color='error' onClick={handleResetLogo} disabled={loading || saving}>
                    Reset
                  </Button>
                </div>
                <Typography>Browse image to preview. File will upload when you click Save Changes.</Typography>
              </div>
            </div>
          </CardContent>
          <CardContent>
            <Grid container spacing={5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label='Company Name'
                  value={company.name}
                  onChange={e => setCompany(prev => ({ ...prev, name: e.target.value }))}
                  disabled={loading}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label='Email'
                  value={company.email || ''}
                  onChange={e => setCompany(prev => ({ ...prev, email: e.target.value }))}
                  disabled={loading}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label='Mobile No'
                  value={company.phone || ''}
                  onChange={e => setCompany(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={loading}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label='Owner Name'
                  value={profile.owner_name}
                  onChange={e => setProfile(prev => ({ ...prev, owner_name: e.target.value }))}
                  disabled={loading}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label='Address'
                  value={profile.address}
                  onChange={e => setProfile(prev => ({ ...prev, address: e.target.value }))}
                  disabled={loading}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label='GST No'
                  value={profile.gst_no}
                  onChange={e => setProfile(prev => ({ ...prev, gst_no: e.target.value }))}
                  disabled={loading}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label='PAN No'
                  value={profile.pan_no}
                  onChange={e => setProfile(prev => ({ ...prev, pan_no: e.target.value }))}
                  disabled={loading}
                />
              </Grid>
              <Grid size={{ xs: 12 }} className='flex gap-4 flex-wrap pbs-6'>
                <Button type='button' variant='contained' onClick={handleSave} disabled={saving || loading}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type='button'
                  variant='outlined'
                  color='secondary'
                  onClick={() => {
                    void loadData()
                  }}
                  disabled={loading || saving}
                >
                  Reset
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default CompanyInfoSettings
