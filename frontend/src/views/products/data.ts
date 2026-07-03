export type ApiProduct = {
  id: number
  name: string
  category: string
  price: string | number
  image?: string | null
  created_at?: string
  updated_at?: string
}

export const resolveBackendApiUrl = () => {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'
  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const backendOrigin = resolveBackendApiUrl().replace(/\/api$/, '')

// Product images are stored as backend-relative paths (e.g. "/storage/products/xxx.jpg")
// and need to be resolved against the backend origin to load — the frontend and API
// are served from different origins in dev and often in production too.
export const resolveProductImageUrl = (value?: string | null) => {
  if (!value) return ''
  if (/^(blob:|data:|https?:\/\/)/i.test(value)) return value

  const normalizedValue = value.startsWith('/') ? value : `/${value}`

  return `${backendOrigin}${normalizedValue}`
}

export const productCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})
