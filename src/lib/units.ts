// Conversions and formatting for display. Values are stored in SI units
// (m/s, metres, degrees) and only converted here.

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

/** Safari reports a missing value as null, NaN or a negative number. */
function isMissing(value: number | null | undefined): value is null | undefined {
  return value == null || Number.isNaN(value) || value < 0
}

export function msToKmh(speedMs: number): number {
  return speedMs * 3.6
}

/** Speed in km/h with no decimals, or "--" when the GPS gave none. */
export function formatSpeedKmh(speedMs: number | null | undefined): string {
  if (isMissing(speedMs)) return '--'
  return Math.round(msToKmh(speedMs)).toString()
}

/** Heading as degrees plus compass point, e.g. "135° SE", or "--" when unknown. */
export function formatHeading(degrees: number | null | undefined): string {
  if (isMissing(degrees)) return '--'
  const rounded = Math.round(degrees) % 360
  const point = COMPASS[Math.round(rounded / 45) % 8]
  return `${rounded}° ${point}`
}

/** Accuracy radius in whole metres, e.g. "± 5 m". */
export function formatAccuracy(metres: number | null | undefined): string {
  if (isMissing(metres)) return '--'
  return `± ${Math.round(metres)} m`
}

/** A duration in ms as seconds with one decimal, e.g. "1.2 s". */
export function formatAge(ms: number | null | undefined): string {
  if (isMissing(ms)) return '--'
  return `${(ms / 1000).toFixed(1)} s`
}
