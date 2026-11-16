// The drive recorder lives outside React so it keeps running while you switch
// tabs, and so there is exactly one GPS watch and one wake lock at a time.
// React components read its state through useRecorder().

import { db, pointsOfDrive } from '../db/db.ts'
import { statsFields } from '../db/drives.ts'
import { toPointFields, type PointFields, type PositionLike } from '../lib/track.ts'
import { summariseTrack, type TrackSummary } from '../lib/trackMath.ts'
import { createReplaySource, type LocationSource, type ReplaySource } from './replaySource.ts'

export type RecorderStatus = 'loading' | 'idle' | 'recording' | 'resumable'
export type WakeLockStatus = 'off' | 'on' | 'failed' | 'unsupported'
export type RecorderError = 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'insecure' | 'storage'

export interface RecorderState {
  /** 'resumable': the app was reloaded while a drive was still recording. */
  status: RecorderStatus
  driveId: number | null
  startedAt: number | null
  pointCount: number
  /** When the latest point arrived on this device (Date.now()), for "seconds since last point". */
  lastPointAt: number | null
  speed: number | null
  accuracy: number | null
  wakeLock: WakeLockStatus
  error: RecorderError | null
  /** Times the app was hidden (call, Control Centre, app switch) during this drive. */
  interruptions: number
  lastInterruptionMs: number | null
  /** Result of the last finished drive. */
  summary: TrackSummary | null
  /** Set while points come from a GPX file instead of the real GPS. */
  replay: { fileName: string; speedFactor: number } | null
}

const ACTIVE_DRIVE_KEY = 'activeDriveId'
/** Restart the GPS watch if nothing arrives for this long while the app is in front. */
const WATCHDOG_MS = 15_000

let state: RecorderState = {
  status: 'loading',
  driveId: null,
  startedAt: null,
  pointCount: 0,
  lastPointAt: null,
  speed: null,
  accuracy: null,
  wakeLock: 'off',
  error: null,
  interruptions: 0,
  lastInterruptionMs: null,
  summary: null,
  replay: null,
}

const listeners = new Set<() => void>()

function update(patch: Partial<RecorderState>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getState(): RecorderState {
  return state
}

let initialised = false
let watchId: number | null = null
let watchStartedAt = 0
let watchdog: ReturnType<typeof setInterval> | null = null
let wakeLock: WakeLockSentinel | null = null
let hiddenAt: number | null = null
/** GPS time of the last stored point; iOS sometimes repeats a fix, which we skip. */
let lastT = 0
/** Point writes run one after another; finish() waits for this before totalling up. */
let writes: Promise<unknown> = Promise.resolve()
/** True while start/continue/finish is saving, so a double tap can't run it twice. */
let busy = false
/** Where positions come from: the real GPS, or a GPX replay that behaves like it. */
let replay: ReplaySource | null = null

function source(): LocationSource {
  return replay ?? navigator.geolocation
}

function once<A extends unknown[]>(action: (...args: A) => Promise<void>) {
  return async (...args: A) => {
    if (busy) return
    busy = true
    try {
      await action(...args)
    } finally {
      busy = false
    }
  }
}

/** Call once at app start: checks whether a drive was left recording. */
export async function init() {
  if (initialised) return
  initialised = true
  document.addEventListener('visibilitychange', onVisibilityChange)
  try {
    const entry = await db.meta.get(ACTIVE_DRIVE_KEY)
    const drive = typeof entry?.value === 'number' ? await db.drives.get(entry.value) : undefined
    if (drive && drive.endedAt === null) {
      update({
        status: 'resumable',
        driveId: drive.id,
        startedAt: drive.startedAt,
        pointCount: await pointsOfDrive(drive.id).count(),
      })
    } else {
      update({ status: 'idle' })
    }
  } catch {
    update({ status: 'idle', error: 'storage' })
  }
}

export const start = once(async (name?: string) => {
  if (state.status !== 'idle' || !gpsAvailable()) return
  const startedAt = Date.now()
  try {
    const driveId = await db.transaction('rw', db.drives, db.meta, async () => {
      const id = await db.drives.add({
        name: name ?? new Date(startedAt).toLocaleString(),
        startedAt,
        endedAt: null,
        calibrationId: null,
        distanceM: 0,
        durationS: 0,
        maxSpeed: null,
        gapCount: 0,
      })
      await db.meta.put({ key: ACTIVE_DRIVE_KEY, value: id })
      return id
    })
    lastT = 0
    update({
      status: 'recording',
      driveId,
      startedAt,
      pointCount: 0,
      lastPointAt: null,
      speed: null,
      accuracy: null,
      error: null,
      interruptions: 0,
      lastInterruptionMs: null,
      summary: null,
    })
    beginTracking()
  } catch {
    update({ error: 'storage' })
  }
})

/** After a reload: carry on adding points to the unfinished drive. */
export const continueDrive = once(async () => {
  if (state.status !== 'resumable' || state.driveId === null || !gpsAvailable()) return
  try {
    const last = await pointsOfDrive(state.driveId).last()
    lastT = last?.t ?? 0
    update({ status: 'recording', error: null, interruptions: 0, lastInterruptionMs: null, summary: null })
    beginTracking()
  } catch {
    update({ error: 'storage' })
  }
})

/** Stop recording (or close an unfinished drive after a reload) and save the totals. */
export const finish = once(async () => {
  if ((state.status !== 'recording' && state.status !== 'resumable') || state.driveId === null) return
  const { driveId, startedAt, status } = state
  endTracking()
  try {
    await writes
    const points = await pointsOfDrive(driveId).toArray()
    // A drive left over from a reload ends at its last point, not now (which may be hours later).
    const endedAt = status === 'resumable' ? (points.at(-1)?.t ?? startedAt!) : Date.now()
    const summary = summariseTrack(points, startedAt!, endedAt)
    await db.transaction('rw', db.drives, db.meta, async () => {
      await db.drives.update(driveId, { endedAt, ...statsFields(summary) })
      await db.meta.delete(ACTIVE_DRIVE_KEY)
    })
    update({ status: 'idle', driveId: null, startedAt: null, summary })
  } catch {
    update({ status: 'idle', error: 'storage' })
  }
})

/**
 * Records a new drive from GPX points instead of the GPS, at real speed or faster.
 * Points go through exactly the same path as live GPS; the drive finishes by
 * itself after the last point.
 */
export async function startReplay(points: PointFields[], fileName: string, speedFactor: number) {
  if (state.status !== 'idle' || busy) return
  replay = createReplaySource(points, speedFactor, () => finish())
  update({ replay: { fileName, speedFactor } })
  await start(`Replay of ${fileName}`)
  if (getState().status !== 'recording') stopReplay()
}

function stopReplay() {
  replay?.stop()
  replay = null
  update({ replay: null })
}

function gpsAvailable(): boolean {
  if (replay) return true
  if (!window.isSecureContext) update({ error: 'insecure' })
  else if (!('geolocation' in navigator)) update({ error: 'unsupported' })
  else return true
  return false
}

function beginTracking() {
  startWatch()
  requestWakeLock()
  watchdog ??= setInterval(checkWatchdog, 5_000)
}

function endTracking() {
  stopWatch()
  releaseWakeLock()
  if (watchdog !== null) clearInterval(watchdog)
  watchdog = null
  hiddenAt = null
  stopReplay()
}

/** Starts the GPS watch, replacing any existing one. */
function startWatch() {
  stopWatch()
  watchStartedAt = Date.now()
  watchId = source().watchPosition(onPosition, onPositionError, {
    enableHighAccuracy: true,
    maximumAge: 0,
  })
}

function stopWatch() {
  if (watchId !== null) source().clearWatch(watchId)
  watchId = null
}

function onPosition(pos: PositionLike) {
  if (state.status !== 'recording' || state.driveId === null) return
  const fields = toPointFields(pos)
  if (fields.t <= lastT) return
  lastT = fields.t
  const point = { driveId: state.driveId, ...fields }
  writes = writes.then(() => db.trackPoints.add(point)).catch(() => update({ error: 'storage' }))
  update({
    pointCount: state.pointCount + 1,
    lastPointAt: Date.now(),
    speed: fields.speed,
    accuracy: fields.accuracy,
    error: state.error === 'storage' ? 'storage' : null,
  })
}

function onPositionError(err: GeolocationPositionError) {
  const kinds: Record<number, RecorderError> = { 1: 'denied', 2: 'unavailable', 3: 'timeout' }
  const kind = kinds[err.code] ?? 'unavailable'
  update({ error: kind })
  // A denied permission won't fix itself; "no signal" usually does, so keep watching.
  if (kind === 'denied') stopWatch()
}

/** If the app is in front but no point has come for a while, iOS may have stalled the watch. */
function checkWatchdog() {
  if (state.status !== 'recording' || watchId === null || document.visibilityState !== 'visible') return
  const lastActivity = Math.max(state.lastPointAt ?? 0, watchStartedAt)
  if (Date.now() - lastActivity > WATCHDOG_MS) startWatch()
}

function onVisibilityChange() {
  if (state.status !== 'recording') return
  if (document.visibilityState === 'hidden') {
    hiddenAt = Date.now()
    return
  }
  if (hiddenAt !== null) {
    update({ interruptions: state.interruptions + 1, lastInterruptionMs: Date.now() - hiddenAt })
    hiddenAt = null
  }
  // iOS may have silently stopped the watch while hidden, so always start a fresh one,
  // unless permission was denied (then restarting would only fail again).
  if (state.error !== 'denied') startWatch()
  requestWakeLock()
}

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return update({ wakeLock: 'unsupported' })
  if (document.visibilityState !== 'visible' || (wakeLock && !wakeLock.released)) return
  try {
    const lock = await navigator.wakeLock.request('screen')
    if (state.status !== 'recording') {
      lock.release()
      return
    }
    wakeLock = lock
    update({ wakeLock: 'on' })
    // iOS releases the lock whenever the app is hidden; onVisibilityChange asks again.
    lock.addEventListener('release', () => {
      if (wakeLock === lock) {
        wakeLock = null
        update({ wakeLock: 'off' })
      }
    })
  } catch {
    update({ wakeLock: 'failed' })
  }
}

function releaseWakeLock() {
  const lock = wakeLock
  wakeLock = null
  lock?.release()
  if (state.wakeLock !== 'unsupported') update({ wakeLock: 'off' })
}
