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
      resurfaced_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
    CREATE INDEX IF NOT EXISTS idx_items_minutes ON items(minutes);
    CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}

/**
 * Reset helper for testing
 */
export function setTestDatabase(db: SQLite.SQLiteDatabase | null): void {
  dbInstance = db;
}
