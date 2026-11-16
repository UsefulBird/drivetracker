import { db } from './db.ts'

const FORMAT = 'drivetracker-backup'

interface Backup {
  format: typeof FORMAT
  schemaVersion: number
  exportedAt: string
  tables: Record<string, unknown[]>
}

/** Every table, as one JSON text. */
export async function exportBackup(): Promise<string> {
  const tables: Record<string, unknown[]> = {}
  await db.transaction('r', db.tables, async () => {
    for (const table of db.tables) tables[table.name] = await table.toArray()
  })
  const backup: Backup = {
    format: FORMAT,
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    tables,
  }
  return JSON.stringify(backup)
}

/**
 * Replaces ALL current data with the backup. Throws a readable Error if the
 * file isn't a DriveTracker backup; in that case nothing is changed.
 */
export async function restoreBackup(json: string) {
  let backup: Backup
  try {
    backup = JSON.parse(json)
  } catch {
    throw new Error('This file is not a DriveTracker backup.')
  }
  if (backup?.format !== FORMAT || typeof backup.tables !== 'object') {
    throw new Error('This file is not a DriveTracker backup.')
  }
  if (backup.schemaVersion > db.verno) {
    throw new Error('This backup is from a newer version of the app. Update the app first.')
  }
  for (const table of db.tables) {
    if (!Array.isArray(backup.tables[table.name])) {
      throw new Error(`The backup is missing the "${table.name}" table.`)
    }
  }

  // One transaction: if anything fails, the old data stays as it was.
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear()
      await table.bulkAdd(backup.tables[table.name])
    }
  })
}
