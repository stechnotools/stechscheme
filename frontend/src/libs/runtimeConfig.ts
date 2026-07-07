// Resolves the backend API base URL without requiring a Docker image rebuild
// when the deployment target changes.
//
// NEXT_PUBLIC_* env vars are inlined into the JS bundle at `next build` time,
// so changing NEXT_PUBLIC_API_URL in .env and restarting the container has no
// effect on client code that reads process.env.NEXT_PUBLIC_API_URL directly.
// The root layout re-reads it from the container's env on every request and
// injects the current value into window.__RUNTIME_CONFIG__ — client code
// should read the API base URL through getApiBaseUrl() below instead of
// process.env.NEXT_PUBLIC_API_URL directly.
//
// Server-side callers (auth.ts, jewelleryApi.ts) hit this same function with
// `window` undefined, so they fall through to process.env.API_URL instead —
// typically a Docker-internal hostname (e.g. http://nginx/api) that's only
// reachable from inside the container network, never from the browser.
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: { apiUrl?: string }
  }
}

export const getApiBaseUrl = (): string => {
  const rawUrl =
    (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__?.apiUrl) ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:8000/api'

  const normalized = rawUrl.replace(/\/+$/, '')

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}
