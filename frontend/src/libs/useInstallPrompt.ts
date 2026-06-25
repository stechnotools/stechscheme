'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const INSTALL_DISMISSED_KEY = 'customer_install_prompt_dismissed'

const isStandaloneDisplay = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as { standalone?: boolean }).standalone === true)

const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

/**
 * Shared beforeinstallprompt capture — any number of components can call this
 * independently (the banner in CustomerPortalShell, the explicit button on the
 * login page, etc.) since beforeinstallprompt is a window-level event every
 * listener receives the same reference to.
 */
export const useInstallPrompt = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setInstalled(isStandaloneDisplay())

    const handler = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    const onInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
      window.localStorage.setItem(INSTALL_DISMISSED_KEY, '1')
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = async (): Promise<boolean> => {
    if (!installEvent) return false

    await installEvent.prompt()
    const choice = await installEvent.userChoice
    setInstallEvent(null)
    if (typeof window !== 'undefined') window.localStorage.setItem(INSTALL_DISMISSED_KEY, '1')

    return choice.outcome === 'accepted'
  }

  return {
    canInstall: !!installEvent,
    installed,
    isIos: isIos(),
    promptInstall
  }
}
