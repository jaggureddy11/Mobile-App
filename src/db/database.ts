import * as SQLite from 'expo-sqlite';

export const DATABASE_NAME = 'maybe_later.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await initSchema(dbInstance);
  return dbInstance;
}

export async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  // PRAGMA journal_mode = WAL for speed and reliability
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT,
      note TEXT,
      minutes INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      done_at TEXT,
      let_go_at TEXT,
      resurfaced_at TEXT,
      snoozed_until TEXT,
      times_surfaced INTEGER DEFAULT 0,
      collection_id TEXT,
      tags TEXT,
      remind_interval TEXT,
      remind_at TEXT,
      image_url TEXT,
      site_name TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
    CREATE INDEX IF NOT EXISTS idx_items_minutes ON items(minutes);
    CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
    CREATE INDEX IF NOT EXISTS idx_items_collection ON items(collection_id);
    CREATE INDEX IF NOT EXISTS idx_items_snoozed ON items(snoozed_until);
    CREATE INDEX IF NOT EXISTS idx_items_times_surfaced ON items(times_surfaced);
    CREATE INDEX IF NOT EXISTS idx_items_resurface_eval ON items(status, minutes, times_surfaced, created_at);

    CREATE TABLE IF NOT EXISTS surface_events (
      id TEXT PRIMARY KEY NOT NULL,
      item_id TEXT NOT NULL,
      shown_at TEXT NOT NULL,
      chip_minutes INTEGER NOT NULL,
      action TEXT,
      acted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_surface_events_item ON surface_events(item_id);
    CREATE INDEX IF NOT EXISTS idx_surface_events_shown ON surface_events(shown_at);

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  // Safe runtime migrations for existing databases
  try { await db.execAsync('ALTER TABLE items ADD COLUMN collection_id TEXT;'); } catch {}
  try { await db.execAsync('ALTER TABLE items ADD COLUMN tags TEXT;'); } catch {}
  try { await db.execAsync('ALTER TABLE items ADD COLUMN remind_interval TEXT;'); } catch {}
  try { await db.execAsync('ALTER TABLE items ADD COLUMN remind_at TEXT;'); } catch {}
  try { await db.execAsync('ALTER TABLE items ADD COLUMN image_url TEXT;'); } catch {}
  try { await db.execAsync('ALTER TABLE items ADD COLUMN site_name TEXT;'); } catch {}
  try { await db.execAsync('ALTER TABLE items ADD COLUMN snoozed_until TEXT;'); } catch {}
  try { await db.execAsync('ALTER TABLE items ADD COLUMN times_surfaced INTEGER DEFAULT 0;'); } catch {}

  // Numbered Migration 001: Purge user_password data and rebuild settings table without column
  await migratePurgePassword(db);

  // Numbered Migration 002: Detect duplicates and safely create partial unique index on non-empty URLs
  await migrateUrlIndex(db);
}

export async function detectAndReportUrlDuplicates(db: SQLite.SQLiteDatabase): Promise<string[]> {
  try {
    const rows = await db.getAllAsync<{ url: string; count: number }>(`
      SELECT url, COUNT(*) as count
      FROM items
      WHERE url IS NOT NULL AND TRIM(url) != '' AND status = 'pending'
      GROUP BY url
      HAVING count > 1;
    `);
    if (rows && rows.length > 0) {
      console.warn('Existing duplicate URLs detected in database:', rows);
      return rows.map((r) => r.url);
    }
  } catch {}
  return [];
}

export async function migrateUrlIndex(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const duplicates = await detectAndReportUrlDuplicates(db);
    if (duplicates.length === 0) {
      await db.execAsync(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_items_unique_url
        ON items(url)
        WHERE url IS NOT NULL AND TRIM(url) != '' AND status = 'pending';
      `);
    } else {
      console.warn('Skipping unique URL index creation due to existing duplicates; application-level deduplication active.');
    }
  } catch (err) {
    console.warn('URL index migration note:', err);
  }
}

export async function migratePurgePassword(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(settings);');
    const hasCol = tableInfo.some((c) => c.name === 'user_password');
    let hasRow = false;
    try {
      const checkRow = await db.getFirstAsync<{ count: number }>(
        "SELECT count(*) as count FROM settings WHERE key = 'user_password'"
      );
      if (checkRow && checkRow.count > 0) hasRow = true;
    } catch {}

    if (hasCol || hasRow) {
      if (hasCol) {
        await db.execAsync('UPDATE settings SET user_password = NULL;');
      }
      if (hasRow) {
        await db.execAsync("UPDATE settings SET value = '' WHERE key = 'user_password';");
        await db.execAsync("DELETE FROM settings WHERE key = 'user_password';");
      }
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS settings_clean (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
        INSERT OR REPLACE INTO settings_clean (key, value)
          SELECT key, value FROM settings WHERE key != 'user_password' AND value IS NOT NULL;
        DROP TABLE settings;
        ALTER TABLE settings_clean RENAME TO settings;
      `);
    }
  } catch (err) {
    console.warn('Settings rebuild migration note:', err);
  }
}

/**
 * Reset helper for testing
 */
export function setTestDatabase(db: SQLite.SQLiteDatabase | null): void {
  dbInstance = db;
}
