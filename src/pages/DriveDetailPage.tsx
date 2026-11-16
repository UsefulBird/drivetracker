import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { db, pointsOfDrive } from '../db/db.ts'
import { deleteDrive } from '../db/drives.ts'
import { saveFile } from '../export/saveFile.ts'
import { buildCsv, fileStamp } from '../lib/csv.ts'
import { buildGpx } from '../lib/gpx.ts'
import { formatDuration, formatKm, formatSpeedKmh } from '../lib/units.ts'

export default function DriveDetailPage() {
  const driveId = Number(useParams().id)
  const navigate = useNavigate()
  const drive = useLiveQuery(() => db.drives.get(driveId), [driveId])
  // Points are loaded up front so the export buttons can open the share sheet
  // straight away; Safari refuses it if the tap was too long ago.
  const points = useLiveQuery(() => pointsOfDrive(driveId).toArray(), [driveId])
  const [message, setMessage] = useState<string | null>(null)

  if (drive === undefined || points === undefined) return <p className="muted">Loading…</p>

  if (!drive) {
    return (
      <section>
        <h1>Drive not found</h1>
        <Link to="/drives">Back to drives</Link>
      </section>
    )
  }

  const recording = drive.endedAt === null
  const baseName = `drive_${fileStamp(drive.startedAt)}`

  const exportAs = async (kind: 'gpx' | 'csv') => {
    const file =
      kind === 'gpx'
        ? new File([buildGpx(drive.name, points)], `${baseName}.gpx`, { type: 'application/gpx+xml' })
        : new File([buildCsv(points)], `${baseName}.csv`, { type: 'text/csv' })
    const result = await saveFile(file)
    setMessage(result === 'needs-tap' ? 'The share sheet was blocked. Tap the button again.' : null)
  }

  const onDelete = async () => {
    if (!window.confirm(`Delete this drive and its ${points.length} points? This can't be undone.`)) return
    await deleteDrive(driveId)
    navigate('/drives', { replace: true })
  }

  return (
    <section>
      <p>
        <Link to="/drives">‹ Drives</Link>
      </p>
      <h1>{drive.name}</h1>
      <p className="muted">{new Date(drive.startedAt).toLocaleString()}</p>

      {recording ? (
        <p className="muted">This drive is still recording. Stop it on the Record tab first.</p>
      ) : (
        <>
          <dl className="stats">
            <div>
              <dt>Duration</dt>
              <dd>{formatDuration(drive.durationS * 1000)}</dd>
            </div>
            <div>
              <dt>Distance</dt>
              <dd>{formatKm(drive.distanceM)}</dd>
            </div>
            <div>
              <dt>Max speed</dt>
              <dd>{formatSpeedKmh(drive.maxSpeed)} km/h</dd>
            </div>
            <div>
              <dt>Points · gaps</dt>
              <dd>
                {points.length} · {drive.gapCount}
              </dd>
            </div>
          </dl>

          <p>
            <button type="button" className="button" onClick={() => exportAs('gpx')}>
              Export GPX
            </button>
          </p>
          <p>
            <button type="button" className="button" onClick={() => exportAs('csv')}>
              Export CSV
            </button>
          </p>
          {message && <p className="muted">{message}</p>}

          <p>
            <button type="button" className="button button-stop" onClick={onDelete}>
              Delete drive
            </button>
          </p>
        </>
      )}
    </section>
  )
}
