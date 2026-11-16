import { db, pointsOfDrive, type Drive } from './db.ts'
import { STATS_VERSION, summariseTrack } from '../lib/trackMath.ts'

/** Stats cached on a drive, ready to pass to db.drives.update(). */
export function statsFields(summary: ReturnType<typeof summariseTrack>): Partial<Drive> {
  return {
    distanceM: summary.distanceM,
    durationS: summary.durationS,
    maxSpeed: summary.maxSpeed,
    gapCount: summary.gapCount,
    pointCount: summary.pointCount,
    statsVersion: STATS_VERSION,
  }
}

/** Recomputes and saves the cached stats of one finished drive. */
export async function recomputeDriveStats(drive: Drive) {
  if (drive.endedAt === null) return
  const points = await pointsOfDrive(drive.id).toArray()
  await db.drives.update(drive.id, statsFields(summariseTrack(points, drive.startedAt, drive.endedAt)))
}

let refreshing: Promise<void> | null = null

/** Brings drives saved by an older version of the app up to date. Safe to call often. */
export function refreshOutdatedStats(): Promise<void> {
  refreshing ??= (async () => {
    const outdated = await db.drives
      .filter((d) => d.endedAt !== null && d.statsVersion !== STATS_VERSION)
      .toArray()
    for (const drive of outdated) await recomputeDriveStats(drive)
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

/** Deletes a drive and all its points. */
export async function deleteDrive(driveId: number) {
  await db.transaction('rw', db.drives, db.trackPoints, async () => {
    await pointsOfDrive(driveId).delete()
    await db.drives.delete(driveId)
  })
}
