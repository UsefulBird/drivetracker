// Converting browser positions into the track point fields we store (SI units).

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
