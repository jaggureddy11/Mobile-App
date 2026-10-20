import { initSchema, setTestDatabase } from '../database';

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
        return [];
      }),

      getFirstAsync: jest.fn().mockImplementation(async (sql: string) => {
        if (sql.includes("key = 'user_password'")) {
          const hasPasswordRow = settingsTable.some((r) => r.key === 'user_password');
          return { count: hasPasswordRow ? 1 : 0 };
        }
        return null;
      }),

      runAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('UPDATE items SET normalized_url = ? WHERE id = ?')) {
          const item = itemsTable.find((i) => i.id === params?.[1]);
          if (item) item.normalized_url = params?.[0];
        }
        return undefined;
      }),

      withTransactionAsync: jest.fn().mockImplementation(async (cb: () => Promise<any>) => await cb()),
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
});
