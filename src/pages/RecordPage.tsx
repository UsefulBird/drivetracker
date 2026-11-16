import { useGeolocation, type GeoErrorKind } from '../hooks/useGeolocation.ts'
import { useNow } from '../hooks/useNow.ts'
import { useWakeLock, type WakeLockStatus } from '../hooks/useWakeLock.ts'
import { formatAccuracy, formatAge, formatHeading, formatSpeedKmh } from '../lib/units.ts'
import { updatesPerMinute } from '../lib/updateRate.ts'

const wakeLockText: Record<WakeLockStatus, string> = {
  on: 'On — screen stays awake',
  off: 'Off',
  failed: 'Failed — the screen may turn off. Try updating iOS.',
  unsupported: 'Not supported on this iOS version — update iOS to keep the screen awake.',
}

export default function RecordPage() {
  const geo = useGeolocation()
  const wakeLock = useWakeLock(geo.running)
  // Re-render 4× a second so "time since last update" counts up smoothly.
  const now = useNow(250, geo.running)
  const coords = geo.position?.coords

  return (
    <section>
      <h1>Record</h1>

      <div className="speed">
        <span className="speed-value">{formatSpeedKmh(coords?.speed)}</span>
        <span className="speed-unit">km/h</span>
      </div>

      <dl className="stats">
        <div>
          <dt>Heading</dt>
          <dd>{formatHeading(coords?.heading)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{formatAccuracy(coords?.accuracy)}</dd>
        </div>
        <div>
          <dt>Last update</dt>
          <dd>{geo.receivedAt === null ? '--' : `${formatAge(now - geo.receivedAt)} ago`}</dd>
        </div>
        <div>
          <dt>Updates / min</dt>
          <dd>{geo.running ? updatesPerMinute(geo.arrivals, now) : '--'}</dd>
        </div>
      </dl>

      <button
        type="button"
        className={geo.running ? 'button button-stop' : 'button'}
        onClick={geo.running ? geo.stop : geo.start}
      >
        {geo.running ? 'Stop GPS' : 'Start GPS'}
      </button>

      <p className="muted">
        Screen wake lock: <span className={`wakelock-${wakeLock}`}>{wakeLockText[wakeLock]}</span>
      </p>

      {geo.running && !geo.position && !geo.error && (
        <p className="muted">Waiting for the first GPS fix…</p>
      )}

      {geo.error && <GeoErrorMessage kind={geo.error} />}
    </section>
  )
}

function GeoErrorMessage({ kind }: { kind: GeoErrorKind }) {
  if (kind === 'denied') {
    return (
      <div className="notice">
        <strong>Location access is blocked.</strong>
        <p>To allow it on your iPhone:</p>
        <ol>
          <li>Open the Settings app.</li>
          <li>
            Go to <b>Privacy &amp; Security › Location Services</b> and make sure Location Services is
            on.
          </li>
          <li>
            Tap <b>Safari Websites</b>, choose <b>While Using the App</b> (or <b>Ask Next Time</b>),
            and turn <b>Precise Location</b> on.
          </li>
          <li>Close DriveTracker completely (swipe it away), open it again and tap Start GPS.</li>
        </ol>
      </div>
    )
  }

  const messages: Record<Exclude<GeoErrorKind, 'denied'>, string> = {
    unavailable: 'No GPS signal right now. Still trying — move outdoors or wait a moment.',
    timeout: 'GPS is taking a long time to respond. Still trying.',
    unsupported: 'This browser does not support location.',
    insecure:
      'Location only works over HTTPS. Open the app from its github.io address (or localhost on your PC).',
  }
  return <div className="notice">{messages[kind]}</div>
}
