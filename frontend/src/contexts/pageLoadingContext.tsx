'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

type PageLoadingContextType = {
  startLoading: () => void
  stopLoading: () => void
}

const PageLoadingContext = createContext<PageLoadingContextType>({
  startLoading: () => {},
  stopLoading: () => {}
})

export const PageLoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const countRef = useRef(0)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const routeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    if (routeTimerRef.current) clearTimeout(routeTimerRef.current)
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    progressIntervalRef.current = null
  }, [])

  const startProgress = useCallback(() => {
    setProgress(0)
    let current = 0
    progressIntervalRef.current = setInterval(() => {
      if (current < 20) {
        current += 8
      } else if (current < 60) {
        current += 3
      } else if (current < 85) {
        current += 1
      } else {
        current += 0.3
      }
      if (current >= 90) {
        current = 90
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setProgress(current)
    }, 200)
  }, [])

  const completeProgress = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    progressIntervalRef.current = null
    setProgress(100)
    dismissTimerRef.current = setTimeout(() => {
      setLoading(false)
      setProgress(0)
    }, 400)
  }, [])

  const showLoading = useCallback(() => {
    clearTimers()
    setLoading(true)
    startProgress()
  }, [clearTimers, startProgress])

  const dismissLoading = useCallback(() => {
    completeProgress()
  }, [completeProgress])

  const startLoading = useCallback(() => {
    countRef.current++
    if (countRef.current === 1) {
      showLoading()
    }
  }, [showLoading])

  const stopLoading = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1)
    if (countRef.current === 0) {
      dismissLoading()
    }
  }, [dismissLoading])

  // Route change triggers a visual-only loading that auto-dismisses
  const [prevPath, setPrevPath] = useState(pathname)
  if (pathname !== prevPath) {
    setPrevPath(pathname)
    countRef.current = 0
    setLoading(true)
    clearTimers()
    startProgress()
    routeTimerRef.current = setTimeout(() => {
      if (countRef.current === 0) {
        completeProgress()
      }
    }, 600)
  }

  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  return (
    <PageLoadingContext.Provider value={{ startLoading, stopLoading }}>
      {children}
      {loading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            zIndex: 9999,
            background: 'linear-gradient(90deg, #1d4ed8, #0f766e, #1d4ed8)',
            transition: progress >= 100 ? 'width 0.3s ease-out' : 'width 0.3s ease',
            width: `${Math.min(progress, 100)}%`
          }}
        />
      )}
    </PageLoadingContext.Provider>
  )
}

export const usePageLoading = () => useContext(PageLoadingContext)
