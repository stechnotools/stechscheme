'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

type FieldConfig = {
  key: string
  label: string
  placeholder?: string
}

type Props = {
  title: string
  subtitle: string
  section: 'payment-gateway' | 'sms-gateway' | 'whatsapp-api' | 'notifications' | 'general-settings'
  fields: FieldConfig[]
}

type SettingsResponse = {
  data?: {
    section: string
    value: Record<string, string>
  }
}

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const SectionSettingsForm = ({ title, subtitle, section, fields }: Props) => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!accessToken) {
        throw new Error('Missing access token')
      }

      const response = await fetch(`${backendApiUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
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
      const response = await request<SettingsResponse>(`/settings/${section}`)
      const value = response.data?.value || {}

      const prepared = fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.key] = value[field.key] || ''
        return acc
      }, {})

      setForm(prepared)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, fields, request, section])

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
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await request(`/settings/${section}`, {
        method: 'PUT',
        body: JSON.stringify({ value: form })
      })

      setSuccess('Settings saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4' className='mbe-1'>
          {title}
        </Typography>
        <Typography color='text.secondary'>{subtitle}</Typography>
      </Grid>
      {error ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error'>{error}</Alert>
        </Grid>
      ) : null}
      {success ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='success'>{success}</Alert>
        </Grid>
      ) : null}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Grid container spacing={4}>
              {fields.map(field => (
                <Grid key={field.key} size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={field.label}
                    placeholder={field.placeholder}
                    value={form[field.key] || ''}
                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    disabled={loading}
                  />
                </Grid>
              ))}
              <Grid size={{ xs: 12 }}>
                <Button variant='contained' onClick={handleSave} disabled={saving || loading}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default SectionSettingsForm
