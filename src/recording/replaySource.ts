import type { PointFields, PositionLike } from '../lib/track.ts'

/** The part of navigator.geolocation the recorder uses, so a replay can stand in for it. */
export interface LocationSource {
  watchPosition(
    onPosition: (pos: PositionLike) => void,
    onError: (err: GeolocationPositionError) => void,
    options?: PositionOptions,
  ): number
  clearWatch(id: number): void
}

export interface ReplaySource extends LocationSource {
  /** Stops the replay clock for good. */
  stop(): void
}

/**
 * Plays recorded points back like a GPS: point i is sent (t_i - t_0) / speedFactor
 * ms after the replay starts. Like real GPS, the clock keeps running whether or
 * not anyone is watching, so restarting the watch doesn't rewind the track.
 * Each position gets the current time as its timestamp, as a live fix would.
 */
export function createReplaySource(points: PointFields[], speedFactor: number, onEnd: () => void): ReplaySource {
  const watchers = new Map<number, (pos: PositionLike) => void>()
  let nextWatchId = 1
  let index = 0
  let startedAt: number | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  const emit = () => {
    const p = points[index++]
    const pos: PositionLike = {
      timestamp: Date.now(),
      coords: {
        latitude: p.lat,
        longitude: p.lon,
        altitude: p.altitude,
        accuracy: p.accuracy,
        altitudeAccuracy: p.altitudeAccuracy,
        heading: p.heading,
        speed: p.speed,
      },
    }
    watchers.forEach((onPosition) => onPosition(pos))
    scheduleNext()
  }

  const scheduleNext = () => {
    if (stopped) return
    if (index >= points.length) {
      stopped = true
      onEnd()
      return
    }
    const dueAt = startedAt! + (points[index].t - points[0].t) / speedFactor
    timer = setTimeout(emit, Math.max(0, dueAt - Date.now()))
  }

  return {
    watchPosition(onPosition) {
      const id = nextWatchId++
      watchers.set(id, onPosition)
      if (startedAt === null) {
        startedAt = Date.now()
        scheduleNext()
      }
      return id
    },
    clearWatch(id) {
      watchers.delete(id)
    },
    stop() {
      stopped = true
      if (timer !== null) clearTimeout(timer)
      watchers.clear()
    },
  }
}
