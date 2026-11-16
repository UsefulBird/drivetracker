import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import { exportBackup, restoreBackup } from '../db/backup.ts'
import { requestPersistentStorage, type PersistStatus } from '../db/persistence.ts'
import { saveFile } from '../export/saveFile.ts'
import { fileStamp } from '../lib/csv.ts'
import { parseGpx } from '../lib/gpx.ts'
import { startReplay } from '../recording/recorder.ts'
import { useRecorder } from '../recording/useRecorder.ts'

const persistText: Record<PersistStatus, string> = {
  persisted: 'Protected — iOS won’t delete your drives to free up space.',
  'not-persisted':
    'Not protected — iOS may delete saved drives if the app goes unused for weeks. Opening it from the home screen icon helps.',
  unsupported: 'Unknown — this browser can’t protect storage.',
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const rec = useRecorder()
  const recorderIdle = rec.status === 'idle'
  const [persist, setPersist] = useState<PersistStatus | null>(null)
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [replaySpeed, setReplaySpeed] = useState(1)
  const [replayError, setReplayError] = useState<string | null>(null)

  useEffect(() => {
    requestPersistentStorage().then(setPersist)
  }, [])

  const onBackup = async (ready?: File) => {
    setBackupMessage(null)
    const file =
      ready ??
      new File([await exportBackup()], `drivetracker-backup_${fileStamp(Date.now())}.json`, {
        type: 'application/json',
      })
    const result = await saveFile(file)
    // Building a big backup can take long enough that Safari blocks the share sheet;
    // then a second tap on "Save backup file" opens it with the ready file.
    setBackupFile(result === 'needs-tap' ? file : null)
  }

  const onRestore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const ok = window.confirm(
      'Restore will DELETE all drives currently on this phone and replace them with the backup. Continue?',
    )
    if (!ok) return
    try {
      await restoreBackup(await file.text())
      // Reload so everything (including an unfinished drive) is read fresh.
      window.location.reload()
    } catch (err) {
      setBackupMessage(err instanceof Error ? err.message : 'Restore failed.')
    }
  }

  const onReplayFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setReplayError(null)
    try {
      const points = parseGpx(await file.text())
      await startReplay(points, file.name, replaySpeed)
      navigate('/record')
    } catch (err) {
      setReplayError(err instanceof Error ? err.message : 'Could not read the file.')
    }
  }

  return (
    <section>
      <h1>Settings</h1>

      <h2>Storage</h2>
      <p className="muted">{persist ? persistText[persist] : 'Checking…'}</p>

      <h2>Backup</h2>
      <p>
        <button type="button" className="button" onClick={() => onBackup()}>
          Back up all data
        </button>
      </p>
      {backupFile && (
        <p>
          <button type="button" className="button" onClick={() => onBackup(backupFile)}>
            Save backup file
          </button>
        </p>
      )}
      <p className="muted">
        Restore <b>replaces everything</b> on this phone with the backup file. Drives recorded since
        that backup will be lost, so back up first.
      </p>
      <label className={`button button-stop${recorderIdle ? '' : ' disabled'}`}>
        Restore from backup…
        <input type="file" accept=".json,application/json" hidden disabled={!recorderIdle} onChange={onRestore} />
      </label>
      {!recorderIdle && <p className="muted">Stop the current drive before restoring.</p>}
      {backupMessage && <div className="notice">{backupMessage}</div>}

      <h2>Replay (testing)</h2>
      <p className="muted">
        Plays a GPX file into the recorder as if it were the GPS, and saves it as a new drive.
      </p>
      <p>
        <label>
          Speed{' '}
          <select value={replaySpeed} onChange={(e) => setReplaySpeed(Number(e.target.value))}>
            <option value={1}>Real time (1×)</option>
            <option value={10}>10× faster</option>
          </select>
        </label>
      </p>
      <label className={`button${recorderIdle ? '' : ' disabled'}`}>
        Pick GPX file and replay…
        <input type="file" accept=".gpx,application/gpx+xml" hidden disabled={!recorderIdle} onChange={onReplayFile} />
      </label>
      {!recorderIdle && <p className="muted">Stop the current drive before starting a replay.</p>}
      {replayError && <div className="notice">{replayError}</div>}

      <h2>Install on iPhone</h2>
      <ol className="muted">
        <li>Open this page in Safari.</li>
        <li>
          Tap the <b>Share</b> button (square with an arrow).
        </li>
        <li>
          Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.
        </li>
        <li>Open DriveTracker from its new home screen icon.</li>
      </ol>
      <p className="muted">
        It then opens full screen without Safari's bars, and works without signal once it has been
        opened online at least once.
      </p>
    </section>
  )
}
