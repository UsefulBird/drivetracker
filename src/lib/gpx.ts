import type { PointFields } from './track.ts'
import { haversineM } from './trackMath.ts'

// GPX has no standard place for speed, accuracy etc., so they go in an
// <extensions> block under our own namespace. Other apps (gpx.studio) ignore it,
// and replaying our own files gets back exactly what was recorded.
const DT_NS = 'https://github.com/UsefulBird/drivetracker/gpx/1'
/** Accuracy assumed for GPX files from other apps, which don't include it. */
const DEFAULT_ACCURACY_M = 5

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

export function buildGpx(name: string, points: PointFields[]): string {
  const ext = (tag: string, value: number | null) => (value === null ? '' : `<dt:${tag}>${value}</dt:${tag}>`)
  const trkpts = points.map((p) => {
    const ele = p.altitude === null ? '' : `<ele>${p.altitude}</ele>`
    const extensions =
      ext('speed', p.speed) +
      ext('course', p.heading) +
      ext('accuracy', p.accuracy) +
      ext('altitudeAccuracy', p.altitudeAccuracy)
    return (
      `      <trkpt lat="${p.lat}" lon="${p.lon}">${ele}<time>${new Date(p.t).toISOString()}</time>` +
      `<extensions>${extensions}</extensions></trkpt>`
    )
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="DriveTracker" xmlns="http://www.topografix.com/GPX/1/1" xmlns:dt="${DT_NS}">`,
    `  <trk>`,
    `    <name>${escapeXml(name)}</name>`,
    `    <trkseg>`,
    ...trkpts,
    `    </trkseg>`,
    `  </trk>`,
    `</gpx>`,
    '',
  ].join('\n')
}

/** Reads the first value of a child element by its name, ignoring namespace prefixes. */
function childNumber(el: Element, localName: string): number | null {
  for (const child of el.getElementsByTagName('*')) {
    if (child.localName === localName) {
      const value = parseFloat(child.textContent ?? '')
      return Number.isFinite(value) ? value : null
    }
  }
  return null
}

/**
 * Reads track points from a GPX file. Missing times become 1 s apart; missing
 * speeds are worked out from the distance to the previous point.
 * Throws an Error with a readable message if the file can't be used.
 */
export function parseGpx(xml: string): PointFields[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) throw new Error('This is not a valid GPX file.')

  const points: PointFields[] = []
  let fallbackT = Date.UTC(2000, 0, 1)
  for (const el of doc.getElementsByTagName('*')) {
    if (el.localName !== 'trkpt') continue
    const lat = parseFloat(el.getAttribute('lat') ?? '')
    const lon = parseFloat(el.getAttribute('lon') ?? '')
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue

    const timeEl = [...el.children].find((c) => c.localName === 'time')
    const parsedT = timeEl ? Date.parse(timeEl.textContent ?? '') : NaN
    const t = Number.isFinite(parsedT) ? parsedT : (fallbackT += 1000)

    points.push({
      t,
      lat,
      lon,
      altitude: childNumber(el, 'ele'),
      speed: childNumber(el, 'speed'),
      heading: childNumber(el, 'course'),
      accuracy: childNumber(el, 'accuracy') ?? DEFAULT_ACCURACY_M,
      altitudeAccuracy: childNumber(el, 'altitudeAccuracy'),
    })
  }

  if (points.length < 2) throw new Error('The GPX file has no track with at least two points.')
  points.sort((a, b) => a.t - b.t)

  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    const prev = points[i - 1]
    const dt = (p.t - prev.t) / 1000
    if (p.speed === null && dt > 0) p.speed = haversineM(prev.lat, prev.lon, p.lat, p.lon) / dt
  }
  return points
}
