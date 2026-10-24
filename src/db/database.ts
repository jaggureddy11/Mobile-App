import * as SQLite from 'expo-sqlite';
import { normalizeUrl } from '../domain/urlUtils';
import { debugLogger } from '../utils/debugLogger';

export const DATABASE_NAME = 'maybe_later.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let startupMigrationError: string | null = null;

export function getStartupMigrationError(): string | null {
  return startupMigrationError;
}

export function setStartupMigrationError(err: string | null): void {
  startupMigrationError = err;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (startupMigrationError) {
    throw new Error(`Database unavailable: ${startupMigrationError}`);
  }
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = await SQLite.openDatabaseAsync(DATABASE_NAME);
  try {
    await initSchema(dbInstance);
  } catch (err: any) {
    if (__DEV__) console.warn('getDatabase initSchema caught error:', err?.message || err);
  }
  if (startupMigrationError) {
    throw new Error(`Database unavailable: ${startupMigrationError}`);
  }
  return dbInstance;
}

/**
 * Re-runs startup schema creation and numbered migrations.
 * Resets startupMigrationError on success.
 */
export async function retryDatabaseInitialization(customDb?: SQLite.SQLiteDatabase): Promise<void> {
  startupMigrationError = null;
  const targetDb = customDb || dbInstance || (await SQLite.openDatabaseAsync(DATABASE_NAME));
  dbInstance = targetDb;
  await initSchema(targetDb);
  // Flush in-memory debug logs to SQLite after successful initialization / retry
  try {
    const { debugLogger } = require('../utils/debugLogger');
    await debugLogger.persist();
  } catch {}
}

/**
 * Helper to run migration transactions with an immediate EXCLUSIVE lock.
 * This prevents concurrent background or share-intent operations from reading or writing
 * half-migrated schemas while numbered migrations are running.
 */
async function runExclusiveTransaction(
  db: SQLite.SQLiteDatabase,
  action: (txn: SQLite.SQLiteDatabase) => Promise<void>
): Promise<void> {
  if (typeof (db as any).withExclusiveTransactionAsync === 'function') {
    return await (db as any).withExclusiveTransactionAsync(action);
  }
  return await db.withTransactionAsync(async () => {
    await action(db);
  });
}

export async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
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
        site_name TEXT,
        normalized_url TEXT,
        merged_into TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
      CREATE INDEX IF NOT EXISTS idx_items_minutes ON items(minutes);
      CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
      CREATE INDEX IF NOT EXISTS idx_items_collection ON items(collection_id);
      CREATE INDEX IF NOT EXISTS idx_items_snoozed ON items(snoozed_until);
      CREATE INDEX IF NOT EXISTS idx_items_times_surfaced ON items(times_surfaced);
      CREATE INDEX IF NOT EXISTS idx_items_resurface_eval ON items(status, minutes, times_surfaced, created_at);
      CREATE INDEX IF NOT EXISTS idx_items_normalized_url ON items(normalized_url);

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
    try { await db.execAsync('ALTER TABLE items ADD COLUMN normalized_url TEXT;'); } catch {}
    try { await db.execAsync('ALTER TABLE items ADD COLUMN merged_into TEXT;'); } catch {}

    // Numbered Migration 001: Purge user_password data and rebuild settings table without column
    await migratePurgePassword(db);

    // Numbered Migration 002: Backfill normalized_url, detect duplicate groups, and create indexed lookup / partial unique index
    await migrateUrlIndex(db);

    // Numbered Migration 003: Add merged_into column for duplicates
    await migrateMergedIntoColumn(db);

    // Numbered Migration 004: Drop unverified FTS5 virtual table and triggers if present
    await migrateDropFts5Cleanup(db);

    setStartupMigrationError(null);
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    setStartupMigrationError(errMsg);
    debugLogger.logError('startup_migrations', err);
    throw err;
  }
}

export interface DuplicateUrlGroup {
  normalized_url: string;
  count: number;
  item_ids: string[];
}

/**
 * Backfills normalized_url for existing items using the canonical normalizeUrl function.
 */
export async function backfillNormalizedUrls(db: SQLite.SQLiteDatabase): Promise<number> {
  try {
    const rows = await db.getAllAsync<{ id: string; url: string }>(`
      SELECT id, url FROM items
      WHERE url IS NOT NULL AND TRIM(url) != '' AND (normalized_url IS NULL OR TRIM(normalized_url) = '');
    `);
    if (rows && rows.length > 0) {
      for (const row of rows) {
        const normalized = normalizeUrl(row.url) || null;
        await db.runAsync('UPDATE items SET normalized_url = ? WHERE id = ?', [normalized, row.id]);
      }
      return rows.length;
    }
  } catch (err: any) {
    if (__DEV__) console.warn('backfillNormalizedUrls warning:', err?.message || err);
  }
  return 0;
}

/**
 * Detects duplicate URL groups on pending items using normalized_url.
 * Does NOT delete anything. Reports exact duplicate groups found.
 */
export async function detectAndReportNormalizedUrlDuplicates(
  db: SQLite.SQLiteDatabase
): Promise<DuplicateUrlGroup[]> {
  try {
    const rows = await db.getAllAsync<{ normalized_url: string; count: number; ids: string }>(`
      SELECT normalized_url, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM items
      WHERE normalized_url IS NOT NULL AND TRIM(normalized_url) != '' AND status = 'pending'
      GROUP BY normalized_url
      HAVING count > 1;
    `);
    if (rows && rows.length > 0) {
      const groups: DuplicateUrlGroup[] = rows.map((r) => ({
        normalized_url: r.normalized_url,
        count: r.count,
        item_ids: r.ids ? r.ids.split(',') : [],
      }));
      console.warn(`[Duplicate Detection] Found ${groups.length} duplicate URL group(s):`, groups);
      return groups;
    }
  } catch (err: any) {
    if (__DEV__) console.warn('detectAndReportNormalizedUrlDuplicates warning:', err?.message || err);
  }
  return [];
}

/**
 * Legacy compatibility wrapper for string array output
 */
export async function detectAndReportUrlDuplicates(db: SQLite.SQLiteDatabase): Promise<string[]> {
  const groups = await detectAndReportNormalizedUrlDuplicates(db);
  return groups.map((g) => g.normalized_url);
}

export async function migrateUrlIndex(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await runExclusiveTransaction(db, async (txn) => {
      // 1. Backfill existing items with normalized_url using txn
      await backfillNormalizedUrls(txn);

      // 2. Ensure general lookup index exists on normalized_url using txn
      await txn.execAsync('CREATE INDEX IF NOT EXISTS idx_items_normalized_url ON items(normalized_url);');

      // 3. Check for duplicate groups using txn
      const duplicateGroups = await detectAndReportNormalizedUrlDuplicates(txn);

      if (duplicateGroups.length === 0) {
        await txn.execAsync(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_items_unique_url
          ON items(normalized_url)
          WHERE normalized_url IS NOT NULL AND TRIM(normalized_url) != '' AND status = 'pending';
        `);
      } else {
        console.warn(
          `[Duplicate Detection] Skipping unique index creation due to ${duplicateGroups.length} existing duplicate group(s). Application-level deduplication remains active.`
        );
      }
    });
  } catch (err: any) {
    if (__DEV__) console.warn('URL index migration warning:', err?.message || err);
    throw err;
  }
}

/**
 * Merge option helper for duplicates (requires user approval to call).
 * Uses dedicated merged_into column and never modifies the user's note field.
 */
export async function mergeDuplicateItems(
  db: SQLite.SQLiteDatabase,
  keepId: string,
  duplicateIds: string[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const dupId of duplicateIds) {
      if (dupId !== keepId) {
        await db.runAsync(
          "UPDATE items SET status = 'let_go', let_go_at = ?, merged_into = ? WHERE id = ?",
          [new Date().toISOString(), keepId, dupId]
        );
      }
    }
  });
}

/**
 * Numbered Migration 003: Add merged_into column for duplicates.
 */
export async function migrateMergedIntoColumn(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(items);');
    const hasCol = tableInfo.some((c) => c.name === 'merged_into');
    if (!hasCol) {
      await runExclusiveTransaction(db, async (txn) => {
        await txn.execAsync('ALTER TABLE items ADD COLUMN merged_into TEXT;');
      });
    }
  } catch (err: any) {
    if (__DEV__) console.warn('Merged into column migration warning:', err?.message || err);
    throw err;
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
      await runExclusiveTransaction(db, async (txn) => {
        if (hasCol) {
          await txn.execAsync('UPDATE settings SET user_password = NULL;');
        }
        if (hasRow) {
          await txn.execAsync("UPDATE settings SET value = '' WHERE key = 'user_password';");
          await txn.execAsync("DELETE FROM settings WHERE key = 'user_password';");
        }
        await txn.execAsync(`
          CREATE TABLE IF NOT EXISTS settings_clean (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
          );
          INSERT OR REPLACE INTO settings_clean (key, value)
            SELECT key, value FROM settings WHERE key != 'user_password' AND value IS NOT NULL;
          DROP TABLE settings;
          ALTER TABLE settings_clean RENAME TO settings;
        `);
      });
    }
  } catch (err) {
    console.warn('Settings rebuild migration note:', err);
    throw err;
  }
}

/**
 * Numbered Migration 004: Clean drop of unverified FTS5 virtual table and triggers if present
 */
export async function migrateDropFts5Cleanup(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await runExclusiveTransaction(db, async (txn) => {
      await txn.execAsync(`
        DROP TRIGGER IF EXISTS items_ai;
        DROP TRIGGER IF EXISTS items_ad;
        DROP TRIGGER IF EXISTS items_au;
        DROP TABLE IF EXISTS items_fts;
      `);
    });
  } catch (err: any) {
    if (__DEV__) console.warn('FTS5 cleanup migration note:', err?.message || err);
    throw err;
  }
}

/**
 * Reset helper for testing
 */
export function setTestDatabase(db: SQLite.SQLiteDatabase | null): void {
  dbInstance = db;
}
