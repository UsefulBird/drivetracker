import { useCallback, useEffect, useRef, useState } from 'react'
import { pruneOld } from '../lib/updateRate.ts'

export type GeoErrorKind = 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'insecure'

const errorKinds: Record<number, GeoErrorKind> = {
  1: 'denied',
  2: 'unavailable',
  3: 'timeout',
}

/** Live GPS via watchPosition. Nothing is stored; it only keeps the latest fix. */
export function useGeolocation() {
  const [running, setRunning] = useState(false)
  const [position, setPosition] = useState<GeolocationPosition | null>(null)
  // When the fix arrived on this device (ms), used for "time since last update".
  const [receivedAt, setReceivedAt] = useState<number | null>(null)
  const [error, setError] = useState<GeoErrorKind | null>(null)
  const watchId = useRef<number | null>(null)
  // Arrival times within the last minute, for "updates per minute".
  const [arrivals, setArrivals] = useState<number[]>([])

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    watchId.current = null
    setRunning(false)
  }, [])

  const start = useCallback(() => {
    if (!window.isSecureContext) return setError('insecure')
    if (!('geolocation' in navigator)) return setError('unsupported')
    if (watchId.current !== null) return

    setError(null)
    setPosition(null)
    setReceivedAt(null)
    setArrivals([])
    setRunning(true)

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now()
        setArrivals((prev) => [...pruneOld(prev, now), now])
        setPosition(pos)
        setReceivedAt(now)
        setError(null)
      },
      (err) => {
        const kind = errorKinds[err.code] ?? 'unavailable'
        setError(kind)
        // A denied permission won't fix itself; the other errors are often temporary
        // (tunnel, indoors), so keep watching.
        if (kind === 'denied') stop()
      },
      { enableHighAccuracy: true, maximumAge: 0 },
    )
  }, [stop])

  // Stop watching if the page is left (e.g. switching tabs in the app).
  useEffect(() => stop, [stop])

  return { running, position, receivedAt, error, arrivals, start, stop }
}
