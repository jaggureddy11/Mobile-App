/**
 * Local-only persistent error logger for debugging.
 * Capped at the last 50 entries.
 * Strictly captures: error_name, screen, timestamp.
 * PRIVACY GUARANTEE: Never logs item content, URLs, titles, notes, or raw error messages.
 * Survives app restarts by persisting into local SQLite settings table.
 */

export interface DebugLogEntry {
  timestamp: string;  // ISO 8601 UTC string
  screen: string;     // Screen / component identifier (sanitized alphanumeric)
  error_name: string; // Error class name only (e.g. 'TypeError', 'RangeError')
}

class DebugLogger {
  public static readonly MAX_ENTRIES = 50;
  private logs: DebugLogEntry[] = [];
  private isLoaded = false;

  /**
   * Records an error entry.
   * STRICT PRIVACY: NEVER inspects error.message or raw string text to guarantee
   * zero URLs, titles, or user notes can ever enter the log.
   */
  logError(screen: string, error: unknown): void {
    let errorName = 'UnknownError';

    if (error instanceof Error) {
      // Strictly error.name (e.g. 'TypeError', 'RangeError', 'SQLiteError').
      // NEVER touch error.message or error.stack!
      errorName = error.name || 'Error';
    } else if (typeof error === 'string') {
      // Never use raw string content as it may contain user text or URLs
      errorName = 'StringError';
    } else if (error && typeof error === 'object') {
      errorName = (error as any).constructor?.name || 'ObjectError';
    }

    // Strip everything except safe alphanumeric characters and underscores
    const sanitizedErrorName = errorName.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40) || 'Error';
    const sanitizedScreen = String(screen || 'Unknown').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40) || 'Unknown';

    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      screen: sanitizedScreen,
      error_name: sanitizedErrorName,
    };

    this.logs.push(entry);

    if (this.logs.length > DebugLogger.MAX_ENTRIES) {
      this.logs = this.logs.slice(-DebugLogger.MAX_ENTRIES);
    }

    this.persist().catch(() => {});
  }

  getLogs(): DebugLogEntry[] {
    return [...this.logs];
  }

  async loadPersistedLogs(): Promise<DebugLogEntry[]> {
    try {
      const { getDatabase } = require('../db/database');
      const db = await getDatabase();
      const row = (await db.getFirstAsync(
        "SELECT value FROM settings WHERE key = 'debug_logs'"
      )) as { value: string } | null;
      if (row?.value) {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed)) {
          this.logs = parsed.slice(-DebugLogger.MAX_ENTRIES).map((e: any) => ({
            timestamp: String(e.timestamp || new Date().toISOString()),
            screen: String(e.screen || 'Unknown').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40),
            error_name: String(e.error_name || 'Error').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40),
          }));
        }
      }
      this.isLoaded = true;
    } catch {
      // Safe fallback if database is not yet ready or during tests
    }
    return [...this.logs];
  }

  async persist(): Promise<void> {
    try {
      const { getDatabase } = require('../db/database');
      const db = await getDatabase();
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('debug_logs', ?)",
        [JSON.stringify(this.logs)]
      );
    } catch {
      // Safe fallback if database is unavailable or locked during migration
    }
  }

  async clear(): Promise<void> {
    this.logs = [];
    try {
      const { getDatabase } = require('../db/database');
      const db = await getDatabase();
      await db.runAsync("DELETE FROM settings WHERE key = 'debug_logs'");
    } catch {
      // Safe fallback
    }
  }

  /**
   * Formats debug info for copying or sharing.
   */
  formatDebugInfo(): string {
    const summary = {
      app: 'Re:Mind',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      error_count: this.logs.length,
      errors: this.logs,
    };
    return JSON.stringify(summary, null, 2);
  }
}

export const debugLogger = new DebugLogger();
