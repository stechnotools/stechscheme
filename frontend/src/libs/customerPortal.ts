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

export async function customerPortalRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getCustomerPortalToken()

  if (!token) {
    throw new Error('Customer session expired. Please login again.')
  }

  const response = await fetch(`${resolveBackendApiUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {})
    },
    cache: 'no-store'
  })

  const payload = (await response.json().catch(() => null)) as { message?: string; errors?: Record<string, string[]> } | null

  if (!response.ok) {
    const validationMessage = payload?.errors ? Object.values(payload.errors).flat().join(' ') : null

    throw new Error(validationMessage || payload?.message || 'Customer portal request failed.')
  }

  return payload as T
}
