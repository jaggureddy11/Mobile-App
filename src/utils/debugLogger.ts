/**
 * Local-only in-memory error logger for debugging.
 * Capped at the last 50 entries.
 * Strictly captures: error name/type, screen name, timestamp.
 * PRIVACY GUARANTEE: Never logs item content, URLs, titles, notes, or user input.
 */

export interface DebugLogEntry {
  timestamp: string; // ISO 8601 UTC string
  screen: string;    // Screen / component identifier
  error_name: string; // Error class name or sanitized short description
}

class DebugLogger {
  private static readonly MAX_ENTRIES = 50;
  private logs: DebugLogEntry[] = [];

  /**
   * Records an error entry. Sanitizes to ensure no user data or URLs are leaked.
   */
  logError(screen: string, error: unknown): void {
    let errorName = 'UnknownError';

    if (error instanceof Error) {
      errorName = error.name || 'Error';
    } else if (typeof error === 'string') {
      // Extract generic error category without raw message content to prevent accidental URL/title leakage
      errorName = error.split(':')[0].trim().slice(0, 40) || 'StringError';
    }

    // Strip any possible URLs or sensitive patterns from error_name
    const sanitizedErrorName = errorName
      .replace(/https?:\/\/[^\s]+/gi, '[URL]')
      .slice(0, 60);

    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      screen: screen.slice(0, 40),
      error_name: sanitizedErrorName,
    };

    this.logs.push(entry);

    if (this.logs.length > DebugLogger.MAX_ENTRIES) {
      this.logs = this.logs.slice(-DebugLogger.MAX_ENTRIES);
    }
  }

  getLogs(): DebugLogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
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
