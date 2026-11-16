import type { PointFields } from './track.ts'

const HEADER = [
  'time_iso',
  'time_ms',
  'lat',
  'lon',
  'altitude_m',
  'speed_ms',
  'speed_kmh',
  'heading_deg',
  'accuracy_m',
  'altitude_accuracy_m',
]

/** One row per point; empty cells where the GPS gave no value. */
export function buildCsv(points: PointFields[]): string {
  const cell = (value: number | null) => (value === null ? '' : String(value))
  const rows = points.map((p) =>
    [
      new Date(p.t).toISOString(),
      p.t,
      p.lat,
      p.lon,
      cell(p.altitude),
      cell(p.speed),
      p.speed === null ? '' : (p.speed * 3.6).toFixed(1),
      cell(p.heading),
      p.accuracy,
      cell(p.altitudeAccuracy),
    ].join(','),
  )
  return [HEADER.join(','), ...rows, ''].join('\n')
}

/** Local date and time for file names, e.g. "2026-11-16_1402". */
export function fileStamp(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
}
