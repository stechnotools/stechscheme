// Third-party Imports
import CredentialProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'

const resolveBackendApiUrl = () => {
  const rawUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendApiUrl = resolveBackendApiUrl()

type BackendLoginResponse = {
  token: string
  data: {
    id: number
    name: string
    email: string | null
    mobile: string | null
    role?: string | null
    roles?: Array<{ name?: string | null }> | string[]
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

        const data = (await res.json()) as BackendLoginResponse | { message?: string; errors?: Record<string, string[]> }

        if (!res.ok || !('token' in data)) {
          throw new Error(
            JSON.stringify({
              message: [data?.message || 'Email/mobile or password is invalid']
            })
          )
        }

        const roles =
          Array.isArray(data.data.roles)
            ? data.data.roles
                .map(item => (typeof item === 'string' ? item : item?.name))
                .filter((name): name is string => Boolean(name))
            : []

        const backendUser: SessionBackendUser = {
          id: data.data.id,
          name: data.data.name,
          email: data.data.email,
          mobile: data.data.mobile,
          role: data.data.role ?? roles[0] ?? null,
          roles,
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
      if (user) {
        token.name = user.name
        token.email = user.email
        ;(token as typeof token & { accessToken?: string; backendUser?: unknown }).accessToken = (user as any).accessToken
        ;(token as typeof token & { accessToken?: string; backendUser?: unknown }).backendUser = (user as any).backendUser
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
