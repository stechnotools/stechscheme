'use client'

// Minimal hand-rolled IndexedDB queue for payment-initiation requests that fail
// due to network loss. Deliberately NOT used for the webhook/money-movement
// itself — that only ever happens server-side via the PhonePe webhook,
// regardless of the customer's connectivity. This queue only retries the
// "start a PhonePe order" call so a flaky connection doesn't silently drop
// the attempt.

const DB_NAME = 'customer-portal-offline'
const STORE_NAME = 'pending-payment-requests'

export type QueuedPaymentRequest = {
  id: string
  membershipId: number
  installmentIds: number[]
  queuedAt: number
}

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

export const queuePaymentRequest = async (membershipId: number, installmentIds: number[]): Promise<QueuedPaymentRequest> => {
  const db = await openDb()
  const entry: QueuedPaymentRequest = {
    id: `${membershipId}-${installmentIds.join('_')}-${Date.now()}`,
    membershipId,
    installmentIds,
    queuedAt: Date.now()
  }

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(entry)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  return entry
}

export const listQueuedPaymentRequests = async (): Promise<QueuedPaymentRequest[]> => {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve(request.result as QueuedPaymentRequest[])
    request.onerror = () => reject(request.error)
  })
}

export const removeQueuedPaymentRequest = async (id: string): Promise<void> => {
  const db = await openDb()

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
