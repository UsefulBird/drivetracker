import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { db } from '../db/db.ts'
import { refreshOutdatedStats } from '../db/drives.ts'
import { formatDuration, formatKm, formatSpeedKmh } from '../lib/units.ts'

export default function DrivesPage() {
  // useLiveQuery re-runs whenever the drives table changes (new drive, delete, recompute).
  const drives = useLiveQuery(() => db.drives.orderBy('startedAt').reverse().toArray())

  useEffect(() => {
    refreshOutdatedStats()
  }, [])

  return (
    <section>
      <h1>Drives</h1>
      {drives?.length === 0 && <p className="muted">No drives yet. Record one on the Record tab.</p>}
      <ul className="list">
        {drives?.map((d) => (
          <li key={d.id}>
            <Link to={`/drives/${d.id}`} className="list-item">
              <strong>{new Date(d.startedAt).toLocaleString()}</strong>
              {d.endedAt === null ? (
                <span className="muted">Still recording</span>
              ) : (
                <span className="muted">
                  {formatDuration(d.durationS * 1000)} · {formatKm(d.distanceM)} · max{' '}
                  {formatSpeedKmh(d.maxSpeed)} km/h · {d.pointCount ?? '…'} points · {d.gapCount}{' '}
                  {d.gapCount === 1 ? 'gap' : 'gaps'}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
