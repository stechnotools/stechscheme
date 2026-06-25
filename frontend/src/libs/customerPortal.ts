'use client'

export const CUSTOMER_PORTAL_TOKEN_KEY = 'customer_portal_token'

export const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

export const getCustomerPortalToken = () =>
  typeof window === 'undefined' ? null : window.localStorage.getItem(CUSTOMER_PORTAL_TOKEN_KEY)

export const setCustomerPortalToken = (token: string) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CUSTOMER_PORTAL_TOKEN_KEY, token)
  }
}

export const clearCustomerPortalToken = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(CUSTOMER_PORTAL_TOKEN_KEY)
  }
}

// Centralized "session is gone" handler — clears the stale token and sends the
// browser to login. A hard navigation (not router.replace) is deliberate here:
// this helper has no access to the Next.js router, and a full reload also
// guarantees any in-memory component state from the dead session is dropped.
const redirectToLogin = () => {
  if (typeof window === 'undefined') return
  clearCustomerPortalToken()
  if (window.location.pathname !== '/customer/login') {
    window.location.href = '/customer/login'
  }
}

async function parseAndThrowIfFailed<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { message?: string; errors?: Record<string, string[]> } | null

  if (!response.ok) {
    if (response.status === 401) {
      redirectToLogin()
    }

    const validationMessage = payload?.errors ? Object.values(payload.errors).flat().join(' ') : null

    throw new Error(validationMessage || payload?.message || 'Customer portal request failed.')
  }

  return payload as T
}

export async function customerPortalRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getCustomerPortalToken()

  if (!token) {
    redirectToLogin()
    throw new Error('Customer session expired. Please login again.')
  }

  const isFormData = init?.body instanceof FormData

  const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      // Let the browser set its own multipart boundary for FormData bodies —
      // forcing application/json here would silently break file uploads.
      ...(init?.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {})
    },
    cache: 'no-store'
  })

  return parseAndThrowIfFailed<T>(response)
}

// For pre-auth flows (e.g. forgot-password) that must not require an existing session token.
export async function customerPortalPublicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {})
    },
    cache: 'no-store'
  })

  return parseAndThrowIfFailed<T>(response)
}
