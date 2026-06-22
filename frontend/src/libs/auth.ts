// Third-party Imports
import CredentialProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

const flattenPermissions = (roles: unknown, directPermissions: unknown): string[] => {
  const rolePermissions = Array.isArray(roles)
    ? (roles as any[]).flatMap(role => (Array.isArray(role?.permissions) ? role.permissions.map((p: any) => p?.name) : []))
    : []
  const ownPermissions = Array.isArray(directPermissions) ? (directPermissions as any[]).map(p => p?.name) : []

  return Array.from(new Set([...rolePermissions, ...ownPermissions].filter(Boolean)))
}

type BackendPermission = { name?: string | null }
type BackendRole = { name?: string | null; permissions?: BackendPermission[] }

type BackendLoginResponse = {
  token: string
  data: {
    id: number
    name: string
    email: string | null
    mobile: string | null
    role?: string | null
    roles?: Array<BackendRole> | string[]
    permissions?: BackendPermission[]
    status?: string | null
  }
  message?: string
}

type SessionBackendUser = {
  id: number
  name: string
  email: string | null
  mobile: string | null
  role?: string | null
  roles?: string[]
  permissions?: string[]
  status?: string | null
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialProvider({
      name: 'Credentials',
      type: 'credentials',
      credentials: {},
      async authorize(credentials) {
        const { email, password } = credentials as { email: string; password: string }

        const res = await fetch(`${backendApiUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            login: email,
            password
          })
        })

        let data: any
        try {
          const clonedRes = res.clone()
          data = await clonedRes.json()
        } catch (err) {
          const text = await res.text().catch(() => '')
          console.error('Failed to parse login response JSON. Response text:', text)
          throw new Error(
            JSON.stringify({
              message: [`Invalid response: ${text.slice(0, 300)}`]
            })
          )
        }

        if (!res.ok || !('token' in data)) {
          throw new Error(
            JSON.stringify({
              message: [data?.message || 'Email/mobile or password is invalid']
            })
          )
        }

        const roles =
          Array.isArray(data?.data?.roles)
            ? (data.data.roles as any[])
                .map((item: any) => (typeof item === 'string' ? item : (item as { name?: string | null })?.name))
                .filter((name: any): name is string => Boolean(name))
            : []

        const permissions = flattenPermissions(data?.data?.roles, data?.data?.permissions)

        const backendUser: SessionBackendUser = {
          id: data.data.id,
          name: data.data.name,
          email: data.data.email,
          mobile: data.data.mobile,
          role: data.data.role ?? roles[0] ?? null,
          roles,
          permissions,
          status: data.data.status ?? null
        }

        return {
          id: String(data.data.id),
          name: data.data.name,
          email: data.data.email ?? data.data.mobile ?? '',
          accessToken: data.token,
          backendUser
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60
  },
  pages: {
    signIn: '/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      const typedToken = token as typeof token & { accessToken?: string; backendUser?: SessionBackendUser }

      if (user) {
        token.name = user.name
        token.email = user.email
        typedToken.accessToken = (user as any).accessToken
        typedToken.backendUser = (user as any).backendUser

        return token
      }

      // Self-heal sessions issued before `permissions` existed on backendUser —
      // without this, an already-logged-in user's sidebar silently goes empty
      // until they log out and back in, since permissions is read as [].
      // This runs at most once per token: on success or failure we always end
      // up with an array, so the `Array.isArray` guard never retries it again —
      // otherwise this extra request would re-run on every single page load
      // and queue up behind the dev backend's single-threaded `php artisan serve`.
      if (typedToken.accessToken && !Array.isArray(typedToken.backendUser?.permissions)) {
        // Super-admin always bypasses permission checks (see usePermissions/
        // filterMenuByPermissions), so there's nothing to gain by waiting on
        // this fetch — skip it and avoid the extra backend round trip.
        if (typedToken.backendUser?.roles?.includes('super-admin')) {
          typedToken.backendUser.permissions = []
        } else {
          let permissions: string[] = []

          try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 3000)

            const res = await fetch(`${backendApiUrl}/auth/me`, {
              headers: { Authorization: `Bearer ${typedToken.accessToken}`, Accept: 'application/json' },
              signal: controller.signal
            })

            clearTimeout(timeout)

            if (res.ok) {
              const me = await res.json()
              permissions = flattenPermissions(me?.data?.roles, me?.data?.permissions)
            }
          } catch {
            // Timed out or backend unreachable — fall back to no permissions rather
            // than leaving the field unset (which would retry on every request).
          }

          typedToken.backendUser = { ...(typedToken.backendUser ?? ({} as SessionBackendUser)), permissions }
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name
        session.user.email = token.email as string
        ;(session as typeof session & { accessToken?: string; backendUser?: unknown }).accessToken = (token as any).accessToken
        ;(session as typeof session & { accessToken?: string; backendUser?: unknown }).backendUser = (token as any).backendUser
      }

      return session
    }
  }
}
