'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

type PermissionApiItem = {
  id: number
  name: string
  module_name?: string
  description?: string
}

type RoleApiItem = {
  id: number
  name: string
  permissions?: Array<{ id: number; name: string }>
}

type PermissionsPaginatedResponse = {
  data: PermissionApiItem[]
}

type RoleResponse = {
  data: RoleApiItem
}

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const formatPermissionToken = (value: string) =>
  value
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())

const moduleLabelMap: Record<string, string> = {
  dashboard: 'Dashboard',
  branches: 'Branches',
  customers: 'Customers',
  kyc: 'KYC',
  schemes: 'Schemes',
  membership: 'Membership',
  installments: 'Installments',
  payments: 'Payments',
  catalog: 'Catalog',
  promotions: 'Promotions',
  reports: 'Reports',
  feedback: 'Feedback',
  users: 'Users & Roles',
  settings: 'Settings'
}

const getModuleName = (item: PermissionApiItem) => {
  if (item.module_name?.trim()) {
    return item.module_name.trim()
  }

  const [moduleKey] = item.name.split('.')
  const normalizedModuleKey = moduleKey?.toLowerCase() ?? ''

  return moduleLabelMap[normalizedModuleKey] || formatPermissionToken(moduleKey || 'General')
}

const getPermissionDescription = (item: PermissionApiItem) => {
  if (item.description?.trim()) {
    return item.description.trim()
  }

  const segments = item.name.split('.').filter(Boolean)

  if (segments.length === 0) {
    return 'Permission access'
  }

  const action = formatPermissionToken(segments[segments.length - 1])
  const target = formatPermissionToken(segments.slice(0, -1).join(' ') || segments[0])

  return `Allows ${action.toLowerCase()} access for ${target}.`
}

const isSuperAdmin = (roleName: string) => {
  const normalized = roleName.toLowerCase().replace(/[_\s]+/g, '-')

  return normalized === 'super-admin' || normalized === 'superadmin'
}

const RolePermissionAssign = () => {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [role, setRole] = useState<RoleApiItem | null>(null)
  const [permissions, setPermissions] = useState<PermissionApiItem[]>([])
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
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
    if (!accessToken || !id) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const [roleResponse, permissionsResponse] = await Promise.all([
        request<RoleResponse>(`/roles/${id}`),
        request<PermissionsPaginatedResponse>('/permissions?per_page=500&sort_by=name&sort_direction=asc')
      ])

      const selected = new Set((roleResponse.data.permissions ?? []).map(item => item.name))

      setRole(roleResponse.data)
      setPermissions(permissionsResponse.data)
      setSelectedPermissions(selected)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load role permissions.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, id, request])

  useEffect(() => {
    if (status === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')
      return
    }

    if (status === 'authenticated') {
      void loadData()
    }
  }, [status, accessToken, loadData])

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, PermissionApiItem[]>>((acc, item) => {
      const moduleName = getModuleName(item)

      if (!acc[moduleName]) {
        acc[moduleName] = []
      }

      acc[moduleName].push(item)

      return acc
    }, {})
  }, [permissions])

  const togglePermission = (permissionName: string) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev)

      if (next.has(permissionName)) {
        next.delete(permissionName)
      } else {
        next.add(permissionName)
      }

      return next
    })
  }

  const toggleModule = (moduleName: string, checked: boolean) => {
    const modulePermissions = groupedPermissions[moduleName] ?? []

    setSelectedPermissions(prev => {
      const next = new Set(prev)

      modulePermissions.forEach(item => {
        if (checked) {
          next.add(item.name)
        } else {
          next.delete(item.name)
        }
      })

      return next
    })
  }

  const handleSave = async () => {
    if (!role) return

    if (isSuperAdmin(role.name)) {
      setSuccess('Super-admin has automatic full access. No assignment required.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await request(`/roles/${role.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: role.name,
          permission_names: Array.from(selectedPermissions)
        })
      })

      setSuccess('Role permissions updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role permissions.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box className='flex items-center justify-between gap-4 flex-wrap'>
          <div>
            <Typography variant='h4' className='mbe-1'>
              Assign Permissions
            </Typography>
            {role ? (
              <Box className='flex items-center gap-2'>
                <Typography color='text.secondary'>Role:</Typography>
                <Chip label={role.name} size='small' className='capitalize' />
              </Box>
            ) : (
              <Typography color='text.secondary'>Loading role details...</Typography>
            )}
          </div>
          <Box className='flex items-center gap-2'>
            <Button variant='outlined' color='secondary' onClick={() => router.push('/apps/roles')}>
              Back to Roles
            </Button>
            <Button variant='contained' onClick={handleSave} disabled={saving || loading || (role ? isSuperAdmin(role.name) : false)}>
              {saving ? 'Saving...' : 'Save Permissions'}
            </Button>
          </Box>
        </Box>
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

      {role && isSuperAdmin(role.name) ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info'>Super-admin always has full access. Permission assignment is optional and skipped.</Alert>
        </Grid>
      ) : null}

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            {loading ? (
              <Typography>Loading permissions...</Typography>
            ) : (
              <div className='flex flex-col gap-6'>
                {Object.entries(groupedPermissions).map(([moduleName, modulePermissions]) => {
                  const selectedCount = modulePermissions.filter(item => selectedPermissions.has(item.name)).length
                  const allSelected = modulePermissions.length > 0 && selectedCount === modulePermissions.length
                  const partiallySelected = selectedCount > 0 && selectedCount < modulePermissions.length

                  return (
                    <div key={moduleName}>
                      <Box className='flex items-center justify-between gap-2 mb-2 flex-wrap'>
                        <Box className='flex items-center gap-3'>
                          <Typography variant='h6'>{moduleName}</Typography>
                          <Chip size='small' label={`${selectedCount}/${modulePermissions.length} selected`} />
                        </Box>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={allSelected}
                              indeterminate={partiallySelected}
                              onChange={(_, checked) => toggleModule(moduleName, checked)}
                            />
                          }
                          label='Select Module'
                        />
                      </Box>
                      <Grid container spacing={2}>
                        {modulePermissions.map(item => (
                          <Grid size={{ xs: 12, md: 6 }} key={item.id}>
                            <Card variant='outlined'>
                              <CardContent className='!pb-4'>
                                <FormControlLabel
                                  className='items-start'
                                  control={
                                    <Checkbox
                                      checked={selectedPermissions.has(item.name)}
                                      onChange={() => togglePermission(item.name)}
                                    />
                                  }
                                  label={
                                    <div>
                                      <Typography className='font-medium'>{item.name}</Typography>
                                      <Typography variant='body2' color='text.secondary'>
                                        {getPermissionDescription(item)}
                                      </Typography>
                                    </div>
                                  }
                                />
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                      <Divider className='mt-5' />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default RolePermissionAssign
