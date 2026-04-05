'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Grid from '@mui/material/Grid'
import type { UsersType } from '@/types/apps/userTypes'
import UserListCards from './UserListCards'
import UserListTable from './UserListTable'

type ApiUser = {
  id: number
  name: string
  email: string | null
  mobile: string | null
  status: string | null
  roles?: Array<{ name: string }>
}

type ApiRole = {
  id: number
  name: string
}

type UsersResponse = {
  data: ApiUser[]
}

type RolesResponse = {
  data: ApiRole[]
}

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const mapStatus = (status: string | null | undefined): UsersType['status'] => {
  if (status === 'active' || status === 'inactive') return status
  return 'pending'
}

const mapUser = (user: ApiUser): UsersType => {
  const roleName = user.roles?.[0]?.name ?? 'staff'
  const usernameBase = user.email || user.mobile || user.name

  return {
    id: user.id,
    avatar: '',
    fullName: user.name,
    username: usernameBase,
    email: user.email || user.mobile || '-',
    role: roleName,
    currentPlan: 'company',
    status: mapStatus(user.status),
    company: '-',
    country: '-',
    contact: user.mobile || '-'
  }
}

const UserList = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [users, setUsers] = useState<UsersType[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const [usersResponse, rolesResponse] = await Promise.all([
        request<UsersResponse>('/users?per_page=200&sort_by=created_at&sort_direction=desc'),
        request<RolesResponse>('/roles?per_page=200&sort_by=name&sort_direction=asc')
      ])

      setUsers(usersResponse.data.map(mapUser))
      setRoles(rolesResponse.data.map(item => item.name))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, request])

  useEffect(() => {
    if (status === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')
      return
    }

    if (status === 'authenticated') {
      void loadData()
    }
  }, [status, accessToken, loadData])

  return (
    <Grid container spacing={6}>
      {error ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error'>{error}</Alert>
        </Grid>
      ) : null}
      <Grid size={{ xs: 12 }}>
        <UserListCards users={users} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <UserListTable users={users} roles={roles} loading={loading} onRefresh={loadData} request={request} />
      </Grid>
    </Grid>
  )
}

export default UserList
