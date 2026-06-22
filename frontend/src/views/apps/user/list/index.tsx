'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Grid from '@mui/material/Grid'
import type { UsersType } from '@/types/apps/userTypes'
import { SkeletonStatCards, SkeletonTable } from '@/components/SkeletonLoader'
import UserListCards from './UserListCards'
import UserListTable from './UserListTable'

type ApiUser = {
  id: number
  name: string
  email: string | null
  mobile: string | null
  status: string | null
  roles?: Array<{ name: string }>
  branches?: Array<{ id: number; name: string }>
}

type ApiRole = {
  id: number
  name: string
}

type ApiBranch = {
  id: number
  name: string
}

type UsersResponse = {
  data: ApiUser[]
  current_page?: number
  last_page?: number
}

type RolesResponse = {
  data: ApiRole[]
}

type BranchesResponse = {
  data: ApiBranch[]
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
  const roleNames = user.roles?.map(r => r.name) ?? []
  const usernameBase = user.email || user.mobile || user.name

  return {
    id: user.id,
    avatar: '',
    fullName: user.name,
    username: usernameBase,
    email: user.email || user.mobile || '-',
    role: roleNames[0] ?? 'staff',
    roles: roleNames,
    currentPlan: 'company',
    status: mapStatus(user.status),
    company: '-',
    country: '-',
    contact: user.mobile || '-',
    branchNames: user.branches?.map(branch => branch.name) || [],
    branchIds: user.branches?.map(branch => branch.id) || []
  }
}

const UserList = () => {
  const { data: session, status } = useSession()
  const accessToken = (session as { accessToken?: string } | null)?.accessToken

  const [users, setUsers] = useState<UsersType[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
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

  // The backend caps per_page at 100 regardless of what's requested, so a
  // single request can silently truncate the list once there are more than
  // 100 users. Page through every result so super-admin sees everyone.
  const fetchAllUsers = useCallback(async (): Promise<ApiUser[]> => {
    const all: ApiUser[] = []
    let page = 1
    let lastPage = 1

    do {
      const res = await request<UsersResponse>(
        `/users?per_page=100&sort_by=created_at&sort_direction=desc&page=${page}`
      )

      all.push(...res.data)
      lastPage = res.last_page ?? 1
      page++
    } while (page <= lastPage)

    return all
  }, [request])

  const loadData = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      const [allUsers, rolesResponse, branchesResponse] = await Promise.all([
        fetchAllUsers(),
        request<RolesResponse>('/roles?per_page=200&sort_by=name&sort_direction=asc'),
        request<BranchesResponse>('/branches?per_page=200&sort_by=name&sort_direction=asc')
      ])

      setUsers(allUsers.map(mapUser))
      setRoles(rolesResponse.data.map(item => item.name))
      setBranches(branchesResponse.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [accessToken, request, fetchAllUsers])

  useEffect(() => {
    if (status === 'authenticated' && !accessToken) {
      setError('Login session token is missing. Please logout and login again.')
      return
    }

    if (status === 'authenticated') {
      void loadData()
    }
  }, [status, accessToken, loadData])

  const showSkeleton = status === 'loading' || (loading && users.length === 0)

  return (
    <Grid container spacing={6}>
      {error ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error'>{error}</Alert>
        </Grid>
      ) : null}
      {showSkeleton ? (
        <>
          <Grid size={{ xs: 12 }}>
            <SkeletonStatCards count={4} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <SkeletonTable rows={8} cols={7} />
          </Grid>
        </>
      ) : (
        <>
          <Grid size={{ xs: 12 }}>
            <UserListCards users={users} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <UserListTable users={users} roles={roles} branches={branches} loading={loading} onRefresh={loadData} request={request} />
          </Grid>
        </>
      )}
    </Grid>
  )
}

export default UserList
