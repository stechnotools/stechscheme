'use client'

import { customerPortalRequest } from '@/libs/customerPortal'

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)

  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

export const isPushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window

export const subscribeToPush = async (): Promise<void> => {
  if (!isPushSupported()) throw new Error('Push notifications are not supported on this browser.')

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) throw new Error('Push notifications are not configured yet.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  })

  await customerPortalRequest('/customer-portal/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription.toJSON())
  })
}

export const unsubscribeFromPush = async (): Promise<void> => {
  if (!isPushSupported()) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    await customerPortalRequest('/customer-portal/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: subscription.endpoint })
    })
    await subscription.unsubscribe()
  }
}

export const getPushSubscriptionStatus = async (): Promise<boolean> => {
  const response = await customerPortalRequest<{ data: { subscribed: boolean } }>('/customer-portal/push/status')

  return response.data.subscribed
}
