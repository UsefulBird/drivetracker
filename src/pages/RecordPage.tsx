import { useNow } from '../hooks/useNow.ts'
import { GAP_THRESHOLD_MS } from '../lib/track.ts'
import { formatAccuracy, formatAge, formatDuration, formatSpeedKmh } from '../lib/units.ts'
import { continueDrive, finish, start, type RecorderError, type WakeLockStatus } from '../recording/recorder.ts'
import { useRecorder } from '../recording/useRecorder.ts'

const wakeLockText: Record<WakeLockStatus, string> = {
  on: 'On — screen stays awake',
  off: 'Off',
  failed: 'Failed — the screen may turn off. Try updating iOS.',
  unsupported: 'Not supported on this iOS version — update iOS to keep the screen awake.',
}

export default function RecordPage() {
  const rec = useRecorder()
  const recording = rec.status === 'recording'
  // Re-render 4× a second so the timer and "since last point" count up smoothly.
  const now = useNow(250, recording)
  const sinceLastPoint = rec.lastPointAt === null ? null : now - rec.lastPointAt

  if (rec.status === 'loading') return null

  if (rec.status === 'resumable') {
    return (
      <section>
        <h1>Record</h1>
        <div className="notice">
          <strong>A drive was still recording when the app closed.</strong>
          <p>
            Started {new Date(rec.startedAt!).toLocaleString()}, {rec.pointCount} points saved.
          </p>
        </div>
        <p>
          <button type="button" className="button" onClick={continueDrive}>
            Continue recording
          </button>
        </p>
        <button type="button" className="button button-stop" onClick={finish}>
          Finish drive
        </button>
        {rec.error && <ErrorMessage kind={rec.error} />}
      </section>
    )
  }

  return (
    <section>
      <h1>Record</h1>

      <div className="speed">
        <span className="speed-value">{recording ? formatSpeedKmh(rec.speed) : '--'}</span>
        <span className="speed-unit">km/h</span>
      </div>

      <dl className="stats">
        <div>
          <dt>Time</dt>
          <dd>{recording ? formatDuration(now - rec.startedAt!) : '--'}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{recording ? formatAccuracy(rec.accuracy) : '--'}</dd>
        </div>
        <div>
          <dt>Points</dt>
          <dd>{recording ? rec.pointCount : '--'}</dd>
        </div>
        <div>
          <dt>Since last point</dt>
          <dd className={sinceLastPoint !== null && sinceLastPoint > GAP_THRESHOLD_MS ? 'late' : ''}>
            {recording ? formatAge(sinceLastPoint) : '--'}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        className={recording ? 'button button-stop' : 'button'}
        onClick={recording ? finish : start}
      >
        {recording ? 'Stop' : 'Start'}
      </button>

      <p className="muted">
        Screen wake lock: <span className={`wakelock-${rec.wakeLock}`}>{wakeLockText[rec.wakeLock]}</span>
      </p>

      {recording && rec.interruptions > 0 && (
        <p className="muted">
          Interruptions: {rec.interruptions} (last {formatAge(rec.lastInterruptionMs)}), recording resumed.
        </p>
      )}

      {recording && rec.pointCount === 0 && !rec.error && (
        <p className="muted">Waiting for the first GPS fix…</p>
      )}

      {!recording && rec.summary && (
        <div className="notice">
          <strong>Drive saved.</strong>
          <p>
            {rec.summary.pointCount} points in {formatDuration(rec.summary.durationS * 1000)},{' '}
            {rec.summary.gapCount} {rec.summary.gapCount === 1 ? 'gap' : 'gaps'} over 5 seconds.
          </p>
        </div>
      )}

      {rec.error && <ErrorMessage kind={rec.error} />}
    </section>
  )
}

function ErrorMessage({ kind }: { kind: RecorderError }) {
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
          <li>Close DriveTracker completely (swipe it away) and open it again.</li>
        </ol>
      </div>
    )
  }

  const messages: Record<Exclude<RecorderError, 'denied'>, string> = {
    unavailable: 'No GPS signal right now. Still trying — move outdoors or wait a moment.',
    timeout: 'GPS is taking a long time to respond. Still trying.',
    unsupported: 'This browser does not support location.',
    insecure:
      'Location only works over HTTPS. Open the app from its github.io address (or localhost on your PC).',
    storage: 'Could not save to the phone’s storage. Check that the iPhone is not out of space.',
  }
  return <div className="notice">{messages[kind]}</div>
}
