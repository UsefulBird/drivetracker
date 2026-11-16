import Dexie, { type EntityTable } from 'dexie'

// All values in SI units: metres, m/s, degrees, ms timestamps (Date.now() epoch).

export interface Drive {
  id: number
  name: string
  startedAt: number
  /** null while the drive is still being recorded. */
  endedAt: number | null
  /** Reserved for sensor calibration (later step). */
  calibrationId: number | null
  distanceM: number
  durationS: number
  /** m/s, null if the GPS never reported a speed. */
  maxSpeed: number | null
  /** Number of pauses between points longer than 5 s. */
  gapCount: number
}

export interface TrackPoint {
  id: number
  driveId: number
  /** GPS fix time, ms. */
  t: number
  lat: number
  lon: number
  altitude: number | null
  speed: number | null
  heading: number | null
  accuracy: number
  altitudeAccuracy: number | null
}

/** Small key/value table for app state that must survive a reload. */
export interface MetaEntry {
  key: string
  value: unknown
}

export const db = new Dexie('drivetracker') as Dexie & {
  drives: EntityTable<Drive, 'id'>
  trackPoints: EntityTable<TrackPoint, 'id'>
  meta: EntityTable<MetaEntry, 'key'>
}

// To change the schema later, add db.version(2) with the new layout below this.
// Never edit an existing version: phones already have it stored.
db.version(1).stores({
  drives: '++id, startedAt',
  trackPoints: '++id, [driveId+t]',
  meta: 'key',
})

/** All points of a drive, oldest first (uses the [driveId+t] index). */
export function pointsOfDrive(driveId: number) {
  return db.trackPoints.where('[driveId+t]').between([driveId, Dexie.minKey], [driveId, Dexie.maxKey])
}
