'use client'

import { useSession } from 'next-auth/react'

type SessionWithBackendUser = {
  backendUser?: {
    permissions?: string[]
    roles?: string[]
  }
}

export const usePermissions = () => {
  const { data: session } = useSession()
  const backendUser = (session as SessionWithBackendUser | null)?.backendUser
  const permissions = backendUser?.permissions ?? []
  const roles = backendUser?.roles ?? []
  const isSuperAdmin = roles.includes('super-admin')

  const hasPermission = (permission?: string) => isSuperAdmin || !permission || permissions.includes(permission)

  return { permissions, roles, isSuperAdmin, hasPermission }
}
