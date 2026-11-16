// Pure calculations on recorded track points. All inputs and outputs are SI.

export const GAP_THRESHOLD_MS = 5_000

const EARTH_RADIUS_M = 6_371_000

export interface PositionLike {
  timestamp: number
  coords: {
    latitude: number
    longitude: number
    altitude: number | null
    accuracy: number
    altitudeAccuracy: number | null
    heading: number | null
    speed: number | null
  }
}

export interface PointFields {
  t: number
  lat: number
  lon: number
  altitude: number | null
  speed: number | null
  heading: number | null
  accuracy: number
  altitudeAccuracy: number | null
}

/** Safari marks missing speed/heading/accuracy as null, NaN or negative. */
function nonNegativeOrNull(value: number | null): number | null {
  return value == null || Number.isNaN(value) || value < 0 ? null : value
}

/** Turns a browser GeolocationPosition into the fields we store. */
export function toPointFields(pos: PositionLike): PointFields {
  const c = pos.coords
  return {
    t: pos.timestamp,
    lat: c.latitude,
    lon: c.longitude,
    // Altitude can legitimately be negative (below sea level).
    altitude: c.altitude == null || Number.isNaN(c.altitude) ? null : c.altitude,
    speed: nonNegativeOrNull(c.speed),
    heading: nonNegativeOrNull(c.heading),
    accuracy: c.accuracy,
    altitudeAccuracy: nonNegativeOrNull(c.altitudeAccuracy),
  }
}

/** Great-circle distance between two lat/lon points, in metres. */
export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
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
export function summariseTrack(
  points: Pick<PointFields, 't' | 'lat' | 'lon' | 'speed'>[],
  startedAt: number,
  endedAt: number,
): TrackSummary {
  let distanceM = 0
  let maxSpeed: number | null = null
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (i > 0) distanceM += haversineM(points[i - 1].lat, points[i - 1].lon, p.lat, p.lon)
    if (p.speed !== null && (maxSpeed === null || p.speed > maxSpeed)) maxSpeed = p.speed
  }
  return {
    pointCount: points.length,
    gapCount: countGaps(points.map((p) => p.t)),
    distanceM,
    durationS: Math.max(0, (endedAt - startedAt) / 1000),
    maxSpeed,
  }
}
