import { debugLogger } from '../debugLogger';

// Mock the database dependency
let mockSettingsStore: Record<string, string> = {};
jest.mock('../../db/database', () => ({
  getDatabase: jest.fn().mockImplementation(async () => ({
    getFirstAsync: jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("key = 'debug_logs'")) {
        return mockSettingsStore['debug_logs'] ? { value: mockSettingsStore['debug_logs'] } : null;
      }
      return null;
    }),
    runAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('debug_logs')) {
        if (sql.includes('DELETE')) {
          delete mockSettingsStore['debug_logs'];
        } else if (sql.includes('INSERT')) {
          mockSettingsStore['debug_logs'] = params?.[0];
        }
      }
      return undefined;
    }),
  })),
}));

describe('debugLogger', () => {
  beforeEach(async () => {
    mockSettingsStore = {};
    await debugLogger.clear();
  });

  it('records error name, screen, and timestamp without sensitive data', () => {
    const err = new TypeError('Cannot read property foo of undefined at https://example.com/secret');
    debugLogger.logError('TodayScreen', err);

    const logs = debugLogger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].screen).toBe('TodayScreen');
    expect(logs[0].error_name).toBe('TypeError');
    expect(logs[0].timestamp).toBeDefined();
    // Verify no URL or message content leaked
    expect(logs[0].error_name).not.toContain('https://');
    expect(logs[0].error_name).not.toContain('secret');
  });

  it('strictly prevents URLs, titles, or user notes from entering the log', () => {
    // 1. Error with URL and confidential user item note in message
    const errorWithUrlAndNote = new Error('HTTP 404 at https://private-domain.org/articles/my-confidential-note-and-title');
    debugLogger.logError('AddScreen', errorWithUrlAndNote);

    // 2. Raw string containing full item content and tracking URL
    const rawStringError = 'Failed: https://instagram.com/reel/12345?utm_source=tracker - My Private Reel Note';
    debugLogger.logError('ItemDetail', rawStringError);

    // 3. Object containing sensitive properties
    const objectError = {
      message: 'Failed to save https://secret-url.com/vault',
      title: 'Secret Item Title',
      note: 'Confidential user notes should never be logged',
    };
    debugLogger.logError('ShareIntent', objectError);

    const logs = debugLogger.getLogs();
    expect(logs).toHaveLength(3);

    // Assert every entry has sanitized error names
    expect(logs[0].error_name).toBe('Error');
    expect(logs[1].error_name).toBe('StringError');
    expect(logs[2].error_name).toBe('Object');

    // Comprehensive check on JSON stringified log output
    const jsonOutput = JSON.stringify(logs);
    expect(jsonOutput).not.toContain('https://');
    expect(jsonOutput).not.toContain('private-domain');
    expect(jsonOutput).not.toContain('instagram');
    expect(jsonOutput).not.toContain('tracker');
    expect(jsonOutput).not.toContain('Confidential');
    expect(jsonOutput).not.toContain('Secret');
    expect(jsonOutput).not.toContain('vault');
  });

  it('caps entries at 50', () => {
    for (let i = 0; i < 65; i++) {
      debugLogger.logError(`Screen_${i}`, new Error(`Fail ${i}`));
    }
    const logs = debugLogger.getLogs();
    expect(logs).toHaveLength(50);
    expect(logs[0].screen).toBe('Screen_15');
    expect(logs[49].screen).toBe('Screen_64');
  });

  it('persists debug logs in storage and restores them across app restarts', async () => {
    debugLogger.logError('SettingsScreen', new SyntaxError('Parsing error'));
    debugLogger.logError('TodayScreen', new RangeError('Out of bounds'));

    await debugLogger.persist();

    expect(mockSettingsStore['debug_logs']).toBeDefined();
    expect(mockSettingsStore['debug_logs']).toContain('SyntaxError');
    expect(mockSettingsStore['debug_logs']).toContain('RangeError');

    // Simulate app restart: clear in-memory logs and re-load from persisted storage
    (debugLogger as any).logs = [];
    expect(debugLogger.getLogs()).toHaveLength(0);

    const restoredLogs = await debugLogger.loadPersistedLogs();
    expect(restoredLogs).toHaveLength(2);
    expect(restoredLogs[0].error_name).toBe('SyntaxError');
    expect(restoredLogs[1].error_name).toBe('RangeError');
  });

  it('formats debug info as JSON string', () => {
    debugLogger.logError('SettingsScreen', new RangeError('Index out of bounds'));
    const formatted = debugLogger.formatDebugInfo();
    const parsed = JSON.parse(formatted);
    expect(parsed.app).toBe('Re:Mind');
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0].error_name).toBe('RangeError');
  });

  it('in-memory buffer remains source-of-truth when persist() throws; error is swallowed; subsequent persist succeeds', async () => {
    const { getDatabase } = require('../../db/database');

    // Seed the buffer directly — avoids the fire-and-forget persist() inside
    // logError() from consuming mock calls before the explicit test assertions.
    (debugLogger as any).logs = [
      { timestamp: new Date().toISOString(), screen: 'TodayScreen', error_name: 'TypeError' },
      { timestamp: new Date().toISOString(), screen: 'SavedScreen', error_name: 'RangeError' },
    ];
    expect(debugLogger.getLogs()).toHaveLength(2);

    // First getDatabase() call → db.runAsync throws (simulates locked DB).
    // Second call → db.runAsync succeeds and writes to the mock store.
    let getDbCallCount = 0;
    (getDatabase as jest.Mock).mockImplementation(async () => {
      getDbCallCount++;
      if (getDbCallCount === 1) {
        return {
          getFirstAsync: jest.fn().mockResolvedValue(null),
          runAsync: jest.fn().mockRejectedValue(new Error('disk I/O error')),
        };
      }
      return {
        getFirstAsync: jest.fn().mockResolvedValue(null),
        runAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
          if (sql.includes('INSERT') && params) {
            mockSettingsStore['debug_logs'] = params[0];
          }
          return undefined;
        }),
      };
    });

    // First persist() — db.runAsync rejects, catch swallows it, resolves undefined.
    await expect(debugLogger.persist()).resolves.toBeUndefined();

    // In-memory buffer must be unaffected by the failed write.
    expect(debugLogger.getLogs()).toHaveLength(2);
    expect(debugLogger.getLogs()[0].error_name).toBe('TypeError');
    expect(debugLogger.getLogs()[1].error_name).toBe('RangeError');

    // Nothing persisted to the store after the first (failed) call.
    expect(mockSettingsStore['debug_logs']).toBeUndefined();

    // After DB recovers, second persist() writes successfully.
    await debugLogger.persist();
    expect(mockSettingsStore['debug_logs']).toBeDefined();
    expect(mockSettingsStore['debug_logs']).toContain('TypeError');
    expect(mockSettingsStore['debug_logs']).toContain('RangeError');

    // In-memory buffer is still intact after the successful persist.
    expect(debugLogger.getLogs()).toHaveLength(2);
  });
});
