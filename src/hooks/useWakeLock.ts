import { useEffect, useState } from 'react'

export type WakeLockStatus = 'off' | 'on' | 'failed' | 'unsupported'

/**
 * Keeps the screen on while `active` is true. iOS drops the lock whenever the
 * app is hidden, so it is requested again each time the page becomes visible.
 */
export function useWakeLock(active: boolean): WakeLockStatus {
  const supported = 'wakeLock' in navigator
  const [status, setStatus] = useState<WakeLockStatus>('off')

  useEffect(() => {
    if (!active || !supported) return

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      if (document.visibilityState !== 'visible') return
      if (sentinel && !sentinel.released) return
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          lock.release()
          return
        }
        sentinel = lock
        setStatus('on')
        lock.addEventListener('release', () => {
          if (!cancelled) setStatus('off')
        })
      } catch {
        if (!cancelled) setStatus('failed')
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') request()
    }

    request()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      sentinel?.release()
      setStatus('off')
    }
  }, [active, supported])

  return supported ? status : 'unsupported'
}
