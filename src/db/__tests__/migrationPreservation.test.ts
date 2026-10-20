import {
  initSchema,
  setTestDatabase,
  mergeDuplicateItems,
  getStartupMigrationError,
  retryDatabaseInitialization,
  getDatabase,
  migrateUrlIndex,
  migrateMergedIntoColumn,
  migratePurgePassword,
} from '../database';

describe('Database Migration & Data Preservation', () => {
  let itemsTable: any[];
  let collectionsTable: any[];
  let settingsTable: { key: string; value: string; user_password?: string }[];
  let surfaceEventsTable: any[];
  let settingsColumns: string[];
  let executedSql: string[];

  let mockDb: any;

  beforeEach(() => {
    executedSql = [];

    // OLD schema starting state:
    // 1. Existing items
    itemsTable = [
      {
        id: 'item-1',
        type: 'link',
        title: 'Essential React Native Architecture',
        url: 'https://example.com/rn-arch',
        minutes: 15,
        status: 'pending',
        created_at: '2026-01-01T10:00:00.000Z',
        times_surfaced: 2,
        collection_id: 'col-1',
      },
      {
        id: 'item-2',
        type: 'task',
        title: 'Review quarterly objectives',
        minutes: 30,
        status: 'done',
        created_at: '2026-01-02T11:00:00.000Z',
        done_at: '2026-01-03T12:00:00.000Z',
        times_surfaced: 1,
        collection_id: 'col-2',
      },
      {
        id: 'item-3',
        type: 'activity',
        title: 'Guided afternoon meditation',
        minutes: 30,
        status: 'let_go',
        created_at: '2026-01-03T09:00:00.000Z',
        let_go_at: '2026-01-04T09:00:00.000Z',
        times_surfaced: 0,
      },
    ];

    // 2. Existing collections
    collectionsTable = [
      { id: 'col-1', name: 'Reading List', color: '#FF5733', created_at: '2026-01-01T09:00:00.000Z' },
      { id: 'col-2', name: 'Work', color: '#33A1FF', created_at: '2026-01-01T09:05:00.000Z' },
    ];

    // 3. Old settings table WITH user_password column and secret row
    settingsColumns = ['key', 'value', 'user_password'];
    settingsTable = [
      { key: 'nudge_time', value: '20:30' },
      { key: 'nudge_frequency', value: 'daily' },
      { key: 'onboarding_completed', value: 'true' },
      { key: 'user_email', value: 'alice@example.com' },
      { key: 'user_password', value: 'unhashed_super_secret_password', user_password: 'unhashed_super_secret_password' },
    ];

    surfaceEventsTable = [];

    mockDb = {
      execAsync: jest.fn().mockImplementation(async (sql: string) => {
        executedSql.push(sql);

        // Handle settings rebuild migration
        if (sql.includes('UPDATE settings SET user_password = NULL;')) {
          settingsTable.forEach((row) => {
            row.user_password = undefined;
          });
        }

        if (sql.includes("DELETE FROM settings WHERE key = 'user_password';")) {
          settingsTable = settingsTable.filter((r) => r.key !== 'user_password');
        }

        if (sql.includes('CREATE TABLE IF NOT EXISTS settings_clean')) {
          // Rebuild settings table without user_password column
          settingsColumns = ['key', 'value'];
          settingsTable = settingsTable
            .filter((r) => r.key !== 'user_password')
            .map((r) => ({ key: r.key, value: r.value }));
        }

        return undefined;
      }),

      getAllAsync: jest.fn().mockImplementation(async (sql: string) => {
        if (sql.includes('PRAGMA table_info(settings);')) {
          return settingsColumns.map((c) => ({ name: c }));
        }
        if (sql.includes('SELECT * FROM items')) {
          return itemsTable;
        }
        if (sql.includes('SELECT * FROM collections')) {
          return collectionsTable;
        }
        if (sql.includes('SELECT key, value FROM settings')) {
          return settingsTable;
        }
        if (sql.includes('SELECT id, url FROM items')) {
          return itemsTable.map((i) => ({ id: i.id, url: i.url }));
        }
        if (sql.includes('SELECT normalized_url, COUNT(*) as count')) {
          return [];
        }
        if (sql.includes('SELECT url, COUNT(*) as count FROM items')) {
          return [];
        }
        if (sql.includes('PRAGMA table_info(items);')) {
          return [{ name: 'id' }, { name: 'title' }];
        }
        return [];
      }),

      getFirstAsync: jest.fn().mockImplementation(async (sql: string) => {
        if (sql.includes("key = 'user_password'")) {
          const hasPasswordRow = settingsTable.some((r) => r.key === 'user_password');
          return { count: hasPasswordRow ? 1 : 0 };
        }
        if (sql.includes("key = 'debug_logs'")) {
          const row = settingsTable.find((r) => r.key === 'debug_logs');
          return row ? { value: row.value } : null;
        }
        return null;
      }),

      runAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('UPDATE items SET normalized_url = ? WHERE id = ?')) {
          const item = itemsTable.find((i) => i.id === params?.[1]);
          if (item) item.normalized_url = params?.[0];
        }
        if (sql.includes("UPDATE items SET status = 'let_go'")) {
          const item = itemsTable.find((i) => i.id === params?.[2]);
          if (item) {
            item.status = 'let_go';
            item.let_go_at = params?.[0];
            item.merged_into = params?.[1];
          }
        }
        if (sql.includes('debug_logs')) {
          if (sql.includes('DELETE')) {
            settingsTable = settingsTable.filter((r) => r.key !== 'debug_logs');
          } else {
            const existing = settingsTable.find((r) => r.key === 'debug_logs');
            if (existing) {
              existing.value = params?.[0];
            } else {
              settingsTable.push({ key: 'debug_logs', value: params?.[0] });
            }
          }
        }
        return undefined;
      }),

      withTransactionAsync: jest.fn().mockImplementation(async (cb: () => Promise<any>) => {
        const snapshotItems = JSON.parse(JSON.stringify(itemsTable));
        const snapshotSettings = JSON.parse(JSON.stringify(settingsTable));
        const snapshotCollections = JSON.parse(JSON.stringify(collectionsTable));
        try {
          return await cb();
        } catch (err) {
          itemsTable = snapshotItems;
          settingsTable = snapshotSettings;
          collectionsTable = snapshotCollections;
          throw err;
        }
      }),

      withExclusiveTransactionAsync: jest.fn().mockImplementation(async (cb: (txn: any) => Promise<any>) => {
        const snapshotItems = JSON.parse(JSON.stringify(itemsTable));
        const snapshotSettings = JSON.parse(JSON.stringify(settingsTable));
        const snapshotCollections = JSON.parse(JSON.stringify(collectionsTable));
        const txn = {
          execAsync: jest.fn().mockImplementation((sql: string) => mockDb.execAsync(sql)),
          getAllAsync: jest.fn().mockImplementation((sql: string) => mockDb.getAllAsync(sql)),
          getFirstAsync: jest.fn().mockImplementation((sql: string) => mockDb.getFirstAsync(sql)),
          runAsync: jest.fn().mockImplementation((sql: string, params?: any[]) => mockDb.runAsync(sql, params)),
        };
        try {
          return await cb(txn);
        } catch (err) {
          itemsTable = snapshotItems;
          settingsTable = snapshotSettings;
          collectionsTable = snapshotCollections;
          throw err;
        }
      }),
    };

    setTestDatabase(mockDb);
  });

  afterEach(() => {
    setTestDatabase(null);
  });

  it('runs all migrations successfully and preserves items, collections, and non-secret settings', async () => {
    // Verify initial preconditions before migration
    expect(settingsColumns).toContain('user_password');
    expect(settingsTable.some((r) => r.key === 'user_password')).toBe(true);
    expect(itemsTable.length).toBe(3);
    expect(collectionsTable.length).toBe(2);

    // Run complete database initialization and migration sequence
    await initSchema(mockDb);

    // 1. Assert Items are fully preserved
    const preservedItems = await mockDb.getAllAsync('SELECT * FROM items');
    expect(preservedItems.length).toBe(3);
    expect(preservedItems.find((i: any) => i.id === 'item-1')).toMatchObject({
      title: 'Essential React Native Architecture',
      url: 'https://example.com/rn-arch',
      collection_id: 'col-1',
      status: 'pending',
    });
    expect(preservedItems.find((i: any) => i.id === 'item-2')).toMatchObject({
      title: 'Review quarterly objectives',
      status: 'done',
    });
    expect(preservedItems.find((i: any) => i.id === 'item-3')).toMatchObject({
      title: 'Guided afternoon meditation',
      status: 'let_go',
    });

    // 2. Assert Collections are fully preserved
    const preservedCollections = await mockDb.getAllAsync('SELECT * FROM collections');
    expect(preservedCollections.length).toBe(2);
    expect(preservedCollections.map((c: any) => c.name)).toEqual(['Reading List', 'Work']);

    // 3. Assert Non-secret Settings are preserved
    const preservedSettings = await mockDb.getAllAsync('SELECT key, value FROM settings');
    const settingsMap = Object.fromEntries(preservedSettings.map((s: any) => [s.key, s.value]));

    expect(settingsMap.nudge_time).toBe('20:30');
    expect(settingsMap.nudge_frequency).toBe('daily');
    expect(settingsMap.onboarding_completed).toBe('true');
    expect(settingsMap.user_email).toBe('alice@example.com');

    // 4. Assert Secret user_password column and rows are completely PURGED
    const finalTableInfo = await mockDb.getAllAsync('PRAGMA table_info(settings);');
    expect(finalTableInfo.map((c: any) => c.name)).not.toContain('user_password');
    expect(settingsMap.user_password).toBeUndefined();

    // 5. Assert all migration steps were executed
    const fullSqlLog = executedSql.join('\n');
    expect(fullSqlLog).toContain('PRAGMA journal_mode = WAL');
    expect(fullSqlLog).toContain('CREATE TABLE IF NOT EXISTS surface_events');
    expect(fullSqlLog).toContain('CREATE TABLE IF NOT EXISTS settings_clean');
    expect(fullSqlLog).toContain('DROP TABLE settings;');
    expect(fullSqlLog).toContain('ALTER TABLE settings_clean RENAME TO settings;');
  });

  it('forces a failure mid-migration, asserts transaction rolls back, and verifies original data remains intact', async () => {
    // Intercept execAsync to fail specifically during migrateUrlIndex
    const originalExec = mockDb.execAsync;
    mockDb.execAsync = jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('idx_items_normalized_url')) {
        throw new Error('SIMULATED_MIGRATION_FAILURE_DISK_FULL');
      }
      return originalExec(sql);
    });

    // Run initSchema and expect it to throw and set startupMigrationError
    await expect(initSchema(mockDb)).rejects.toThrow('SIMULATED_MIGRATION_FAILURE_DISK_FULL');
    expect(getStartupMigrationError()).toContain('SIMULATED_MIGRATION_FAILURE_DISK_FULL');

    // Verify all original items remain intact and unaltered
    const preservedItems = await mockDb.getAllAsync('SELECT * FROM items');
    expect(preservedItems.length).toBe(3);
    expect(preservedItems[0].id).toBe('item-1');
    expect(preservedItems[0].title).toBe('Essential React Native Architecture');
    expect(preservedItems[1].id).toBe('item-2');
    expect(preservedItems[2].id).toBe('item-3');

    // Verify original collections are intact
    const preservedCollections = await mockDb.getAllAsync('SELECT * FROM collections');
    expect(preservedCollections.length).toBe(2);
    expect(preservedCollections[0].name).toBe('Reading List');
  });

  it('merges duplicate items using the separate merged_into column without altering the user note', async () => {
    await initSchema(mockDb);

    const keepItem = itemsTable[0];
    const dupItem: any = {
      id: 'item-dup',
      type: 'link',
      title: 'Duplicate Item',
      url: 'https://example.com/rn-arch',
      note: 'My personal precious note',
      minutes: 15,
      status: 'pending',
      created_at: '2026-01-01T11:00:00.000Z',
    };
    itemsTable.push(dupItem);

    await mergeDuplicateItems(mockDb, keepItem.id, [dupItem.id]);

    expect(dupItem.status).toBe('let_go');
    expect(dupItem.merged_into).toBe(keepItem.id);
    expect(dupItem.note).toBe('My personal precious note'); // Untouched! No [Merged into ...] prepended or appended
  });

  it('fails safely when startupMigrationError is set, and retryDatabaseInitialization re-runs migrations and recovers cleanly', async () => {
    let failAttempts = 1;
    const originalExec = mockDb.execAsync;
    mockDb.execAsync = jest.fn().mockImplementation(async (sql: string) => {
      if (failAttempts > 0 && sql.includes('idx_items_normalized_url')) {
        failAttempts--;
        throw new Error('SIMULATED_TRANSIENT_LOCK_ERROR');
      }
      return originalExec(sql);
    });

    // 1. Initial attempt fails
    await expect(initSchema(mockDb)).rejects.toThrow('SIMULATED_TRANSIENT_LOCK_ERROR');
    expect(getStartupMigrationError()).toBe('SIMULATED_TRANSIENT_LOCK_ERROR');

    // 2. All entry points touching database fail safely (getDatabase throws explicit unavailable message)
    await expect(getDatabase()).rejects.toThrow('Database unavailable: SIMULATED_TRANSIENT_LOCK_ERROR');

    // 3. Retry loading reruns the migrations and resets the error
    await retryDatabaseInitialization(mockDb);
    expect(getStartupMigrationError()).toBeNull();

    // 4. getDatabase now returns the db instance and is ready for use
    expect(await getDatabase()).toBe(mockDb);
  });

  it('strictly verifies real migration functions (migrateUrlIndex, migrateMergedIntoColumn, migratePurgePassword) run within runExclusiveTransaction and use txn exclusively without touching outer db', async () => {
    let inExclusiveTxn = false;
    const txnRecordedCalls: { method: string; sql: string; params?: any[] }[] = [];

    // Guard to catch any statement executed against outer db while an exclusive transaction is active
    const outerGuard = (methodName: string) => {
      if (inExclusiveTxn) {
        throw new Error(
          `CRITICAL_VIOLATION: Outer db.${methodName}() called inside withExclusiveTransactionAsync! Migrations must use the txn handle.`
        );
      }
    };

    const txnObject = {
      execAsync: jest.fn().mockImplementation(async (sql: string) => {
        txnRecordedCalls.push({ method: 'execAsync', sql });
        return mockDb.execAsync(sql);
      }),
      getAllAsync: jest.fn().mockImplementation(async (sql: string) => {
        txnRecordedCalls.push({ method: 'getAllAsync', sql });
        return mockDb.getAllAsync(sql);
      }),
      getFirstAsync: jest.fn().mockImplementation(async (sql: string) => {
        txnRecordedCalls.push({ method: 'getFirstAsync', sql });
        return mockDb.getFirstAsync(sql);
      }),
      runAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
        txnRecordedCalls.push({ method: 'runAsync', sql, params });
        return mockDb.runAsync(sql, params);
      }),
    };

    const guardedDb: any = {
      ...mockDb,
      execAsync: jest.fn().mockImplementation(async (sql: string) => {
        outerGuard('execAsync');
        return mockDb.execAsync(sql);
      }),
      getAllAsync: jest.fn().mockImplementation(async (sql: string) => {
        outerGuard('getAllAsync');
        return mockDb.getAllAsync(sql);
      }),
      getFirstAsync: jest.fn().mockImplementation(async (sql: string) => {
        outerGuard('getFirstAsync');
        return mockDb.getFirstAsync(sql);
      }),
      runAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
        outerGuard('runAsync');
        return mockDb.runAsync(sql, params);
      }),
      withExclusiveTransactionAsync: jest.fn().mockImplementation(async (cb: (txn: any) => Promise<any>) => {
        inExclusiveTxn = true;
        try {
          return await cb(txnObject);
        } finally {
          inExclusiveTxn = false;
        }
      }),
    };

    // 1. Test real migratePurgePassword: must run inside exclusive transaction using txn
    settingsColumns = ['key', 'value', 'user_password'];
    settingsTable = [{ key: 'user_password', value: 'secret123', user_password: 'secret123' }];
    txnRecordedCalls.length = 0;
    await expect(migratePurgePassword(guardedDb)).resolves.not.toThrow();
    expect(guardedDb.withExclusiveTransactionAsync).toHaveBeenCalled();
    expect(txnRecordedCalls.some((c) => c.sql.includes('settings_clean'))).toBe(true);

    // 2. Test real migrateUrlIndex: must run inside exclusive transaction using txn
    txnRecordedCalls.length = 0;
    await expect(migrateUrlIndex(guardedDb)).resolves.not.toThrow();
    expect(txnRecordedCalls.some((c) => c.sql.includes('idx_items_normalized_url'))).toBe(true);

    // 3. Test real migrateMergedIntoColumn: must run inside exclusive transaction using txn
    txnRecordedCalls.length = 0;
    await expect(migrateMergedIntoColumn(guardedDb)).resolves.not.toThrow();
    expect(txnRecordedCalls.some((c) => c.sql.includes('ALTER TABLE items ADD COLUMN merged_into'))).toBe(true);
  });

  it('proves that retryDatabaseInitialization flushes in-memory debug log buffer to SQLite upon successful retry', async () => {
    const { debugLogger } = require('../../utils/debugLogger');
    await debugLogger.clear();

    // 1. Log errors while database is failing or in memory
    debugLogger.logError('TodayScreen', new TypeError('Pre-retry error 1'));
    debugLogger.logError('SavedScreen', new RangeError('Pre-retry error 2'));

    expect(debugLogger.getLogs()).toHaveLength(2);
    // SQLite settings table does not yet have debug_logs persisted
    expect(settingsTable.find((r) => r.key === 'debug_logs')).toBeUndefined();

    // 2. Call retryDatabaseInitialization (not direct debugLogger.persist())
    await retryDatabaseInitialization(mockDb);

    // 3. Proves successful retry flushes in-memory debug log buffer to SQLite
    const persistedEntry = settingsTable.find((r) => r.key === 'debug_logs');
    expect(persistedEntry).toBeDefined();
    expect(persistedEntry?.value).toContain('TypeError');
    expect(persistedEntry?.value).toContain('RangeError');
  });
});
