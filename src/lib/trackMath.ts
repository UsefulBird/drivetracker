// Pure calculations on recorded track points. All inputs and outputs are SI.

export const GAP_THRESHOLD_MS = 5_000
/** Points less accurate than this are left out of the distance (GPS jumps). */
export const MAX_ACCURACY_FOR_DISTANCE_M = 30
/** Bump when the stats below change, so older drives get recomputed. */
export const STATS_VERSION = 1

const EARTH_RADIUS_M = 6_371_000

interface MathPoint {
  t: number
  lat: number
  lon: number
  speed: number | null
  accuracy: number
}

/** Great-circle distance between two lat/lon points, in metres. */
export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

/** Track length in metres, skipping points with accuracy worse than the limit. */
export function distanceM(
  points: Pick<MathPoint, 'lat' | 'lon' | 'accuracy'>[],
  maxAccuracyM = MAX_ACCURACY_FOR_DISTANCE_M,
): number {
  let total = 0
  let prev: Pick<MathPoint, 'lat' | 'lon'> | null = null
  for (const p of points) {
    if (p.accuracy > maxAccuracyM) continue
    if (prev) total += haversineM(prev.lat, prev.lon, p.lat, p.lon)
    prev = p
  }
  return total
}

/** Seconds between two ms timestamps (never negative). */
export function durationS(startedAt: number, endedAt: number): number {
  return Math.max(0, (endedAt - startedAt) / 1000)
}

/** Highest speed in m/s, or null if the GPS never reported one. */
export function maxSpeed(points: Pick<MathPoint, 'speed'>[]): number | null {
  let max: number | null = null
  for (const p of points) {
    if (p.speed !== null && (max === null || p.speed > max)) max = p.speed
  }
  return max
}

/** Number of pauses between consecutive points longer than the threshold. */
export function countGaps(times: number[], thresholdMs = GAP_THRESHOLD_MS): number {
  let gaps = 0
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] > thresholdMs) gaps++
  }
  return gaps
}

export interface TrackSummary {
  pointCount: number
  gapCount: number
  distanceM: number
  durationS: number
  maxSpeed: number | null
}

/** Totals for a finished drive. Points must be sorted by time. */
export function summariseTrack(points: MathPoint[], startedAt: number, endedAt: number): TrackSummary {
  return {
    pointCount: points.length,
    gapCount: countGaps(points.map((p) => p.t)),
    distanceM: distanceM(points),
    durationS: durationS(startedAt, endedAt),
    maxSpeed: maxSpeed(points),
  }
}
