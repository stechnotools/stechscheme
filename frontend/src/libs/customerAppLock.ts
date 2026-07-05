'use client'

// Device-local app lock (MPIN + biometric) for the customer portal PWA.
//
// This intentionally does NOT re-authenticate against the backend — the
// customer is already logged in (a valid bearer token sits in localStorage
// via customerPortal.ts). MPIN/biometric here just re-locks the *UI* on this
// device between app opens, the same pattern banking apps use for quick
// unlock. It's a convenience/privacy gate, not a replacement for the login
// token as the source of truth — anyone with access to the token directly
// (e.g. via devtools) bypasses this, same as they would on a phone banking
// app with a jailbroken/rooted device.

const MPIN_HASH_KEY = 'customer_app_lock_mpin_hash'
const BIOMETRIC_CREDENTIAL_KEY = 'customer_app_lock_biometric_credential_id'
const SESSION_UNLOCKED_KEY = 'customer_app_lock_unlocked'

const encoder = new TextEncoder()

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

// ---- MPIN ----

export const isMpinEnabled = () => typeof window !== 'undefined' && !!window.localStorage.getItem(MPIN_HASH_KEY)

export const setMpin = async (pin: string): Promise<void> => {
  const hash = await sha256Hex(pin)

  window.localStorage.setItem(MPIN_HASH_KEY, hash)
}

export const verifyMpin = async (pin: string): Promise<boolean> => {
  const stored = window.localStorage.getItem(MPIN_HASH_KEY)

  if (!stored) return false

  const hash = await sha256Hex(pin)

  return hash === stored
}

export const disableMpin = () => {
  window.localStorage.removeItem(MPIN_HASH_KEY)
}

// ---- Biometric (WebAuthn platform authenticator, verified locally) ----

export const isBiometricSupported = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export const isBiometricEnabled = () =>
  typeof window !== 'undefined' && !!window.localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY)

const randomChallenge = () => crypto.getRandomValues(new Uint8Array(32))

export const enrollBiometric = async (customerName: string): Promise<void> => {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge(),
      rp: { name: 'City Jewelers', id: window.location.hostname },
      user: {
        id: encoder.encode(customerName || 'customer'),
        name: customerName || 'customer',
        displayName: customerName || 'Customer'
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 } // RS256
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000
    }
  })) as PublicKeyCredential | null

  if (!credential) throw new Error('Biometric enrollment was cancelled.')

  window.localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, credential.id)
}

export const verifyBiometric = async (): Promise<boolean> => {
  const credentialId = window.localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY)

  if (!credentialId) return false

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        allowCredentials: [{ id: Uint8Array.from(atob(credentialId.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000
      }
    })

    return !!assertion
  } catch {
    // Any rejection (wrong finger, cancelled, no match) means "not unlocked".
    return false
  }
}

export const disableBiometric = () => {
  window.localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY)
}

// ---- Combined lock state ----

export const isAppLockEnabled = () => isMpinEnabled() || isBiometricEnabled()

// Unlocked-state lives in sessionStorage so it clears when the tab/app is
// closed (re-locks on next open) but doesn't re-prompt on every in-app
// navigation within the same open session.
export const isUnlockedThisSession = () =>
  typeof window !== 'undefined' && window.sessionStorage.getItem(SESSION_UNLOCKED_KEY) === '1'

export const markUnlockedThisSession = () => {
  window.sessionStorage.setItem(SESSION_UNLOCKED_KEY, '1')
}

export const clearUnlockedSession = () => {
  window.sessionStorage.removeItem(SESSION_UNLOCKED_KEY)
}
