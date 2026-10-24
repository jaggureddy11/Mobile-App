import {
  parseAndValidateBackupString,
  validateBackupData,
  restoreBackupData,
  generateBackupData,
  MAX_BACKUP_SIZE_BYTES,
  ReMindBackup,
} from '../backupService';
import { setTestDatabase } from '../../db/database';

describe('backupService: Import Validation, Transaction Rollback & Security', () => {
  let mockDb: any;
  let itemsTable: any[];
  let collectionsTable: any[];
  let settingsTable: { key: string; value: string }[];

  beforeEach(() => {
    itemsTable = [
      {
        id: 'existing-1',
        type: 'link',
        title: 'Pre-existing Article',
        url: 'https://example.com/existing',
        normalized_url: 'https://example.com/existing',
        minutes: 5,
        status: 'pending',
        created_at: '2026-10-01T10:00:00Z',
      },
    ];

    collectionsTable = [
      {
        id: 'col-1',
        name: 'Work',
        color: '#D4C4B0',
        created_at: '2026-10-01T10:00:00Z',
      },
    ];

    settingsTable = [];

    mockDb = {
      getFirstAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('SELECT id FROM items WHERE normalized_url = ?')) {
          const match = itemsTable.find(
            (i) => i.normalized_url === params?.[0] && i.status === 'pending'
          );
          return match ? { id: match.id } : null;
        }
        return null;
      }),
      getAllAsync: jest.fn().mockImplementation(async (sql: string) => {
        if (sql.includes('FROM items')) return itemsTable;
        if (sql.includes('FROM collections')) return collectionsTable;
        if (sql.includes('FROM settings')) return settingsTable;
        return [];
      }),
      runAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('INSERT INTO items')) {
          itemsTable.push({
            id: params?.[0],
            type: params?.[1],
            title: params?.[2],
            url: params?.[3],
            note: params?.[4],
            minutes: params?.[5],
            status: params?.[6],
            created_at: params?.[7],
            done_at: params?.[8],
            let_go_at: params?.[9],
            resurfaced_at: params?.[10],
            snoozed_until: params?.[11],
            times_surfaced: params?.[12],
            collection_id: params?.[13],
            tags: params?.[14],
            remind_interval: params?.[15],
            domain: params?.[16],
            author: params?.[17],
            site_name: params?.[18],
            normalized_url: params?.[19],
            merged_into: params?.[20],
          });
        }
        if (sql.includes('INSERT OR IGNORE INTO collections')) {
          if (!collectionsTable.some((c) => c.id === params?.[0] || c.name === params?.[1])) {
            collectionsTable.push({
              id: params?.[0],
              name: params?.[1],
              color: params?.[2],
              created_at: params?.[3],
            });
          }
        }
        if (sql.includes('INSERT OR REPLACE INTO settings')) {
          const key = params?.[0];
          const value = params?.[1];
          const existing = settingsTable.find((s) => s.key === key);
          if (existing) {
            existing.value = value;
          } else {
            settingsTable.push({ key, value });
          }
        }
        return { changes: 1 };
      }),
      withExclusiveTransactionAsync: jest.fn().mockImplementation(async (callback: (txn: any) => Promise<any>) => {
        const itemsSnapshot = JSON.parse(JSON.stringify(itemsTable));
        const collectionsSnapshot = JSON.parse(JSON.stringify(collectionsTable));
        const settingsSnapshot = JSON.parse(JSON.stringify(settingsTable));
        const txn = {
          runAsync: (...args: any[]) => mockDb.runAsync(...args),
          getFirstAsync: (...args: any[]) => mockDb.getFirstAsync(...args),
          getAllAsync: (...args: any[]) => mockDb.getAllAsync(...args),
        };
        try {
          return await callback(txn);
        } catch (err) {
          itemsTable = itemsSnapshot;
          collectionsTable = collectionsSnapshot;
          settingsTable = settingsSnapshot;
          throw err;
        }
      }),
      withTransactionAsync: jest.fn().mockImplementation(async (callback: () => Promise<any>) => {
        // Snapshot existing state for rollback simulation
        const itemsSnapshot = JSON.parse(JSON.stringify(itemsTable));
        const collectionsSnapshot = JSON.parse(JSON.stringify(collectionsTable));
        const settingsSnapshot = JSON.parse(JSON.stringify(settingsTable));
        try {
          return await callback();
        } catch (err) {
          // Transaction rollback restores original state
          itemsTable = itemsSnapshot;
          collectionsTable = collectionsSnapshot;
          settingsTable = settingsSnapshot;
          throw err;
        }
      }),
    };

    setTestDatabase(mockDb);
  });

  // 1. Bad JSON
  test('rejects malformed or unparseable JSON', () => {
    expect(() => parseAndValidateBackupString('{ invalid json')).toThrow(
      /Failed to parse backup JSON/
    );
  });

  // 2. Wrong or missing version
  test('rejects backup with missing or unsupported version', () => {
    const missingVersion = JSON.stringify({
      data: { items: [] },
    });
    expect(() => parseAndValidateBackupString(missingVersion)).toThrow(
      /Unsupported backup version/
    );

    const wrongVersion = JSON.stringify({
      version: 2,
      data: { items: [] },
    });
    expect(() => parseAndValidateBackupString(wrongVersion)).toThrow(
      /Unsupported backup version: 2/
    );
  });

  // 3. Missing fields and invalid shapes
  test('rejects backup when data or items array is missing', () => {
    expect(() =>
      parseAndValidateBackupString(JSON.stringify({ version: 1 }))
    ).toThrow(/Invalid backup structure: "data" object is required/);

    expect(() =>
      parseAndValidateBackupString(JSON.stringify({ version: 1, data: {} }))
    ).toThrow(/Invalid backup structure: "data.items" must be an array/);
  });

  test('rejects backup with invalid item records (missing title or unrecognized type)', () => {
    // Missing title
    const missingTitle = {
      version: 1,
      data: {
        items: [{ type: 'link', minutes: 5 }],
      },
    };
    expect(() => validateBackupData(missingTitle)).toThrow(/missing or empty "title"/);

    // Unrecognized type
    const invalidType = {
      version: 1,
      data: {
        items: [{ title: 'Valid Title', type: 'unknown_type' }],
      },
    };
    expect(() => validateBackupData(invalidType)).toThrow(/unrecognized type "unknown_type"/);
  });

  // 4. Duplicate URLs (both against DB and within the batch)
  test('uses normalized-URL duplicate check to skip duplicates from DB and within batch', async () => {
    const backup: ReMindBackup = {
      version: 1,
      exported_at: '2026-10-24T12:00:00Z',
      app_name: 'Re:Mind',
      data: {
        collections: [],
        items: [
          // 1. Duplicate of existing item in DB (normalized to https://example.com/existing)
          {
            id: 'import-1',
            type: 'link',
            title: 'Duplicate from DB',
            url: 'https://example.com/existing?utm_source=twitter',
            minutes: 5,
            status: 'pending',
            created_at: '2026-10-24T12:00:00Z',
          },
          // 2. Fresh new item
          {
            id: 'import-2',
            type: 'link',
            title: 'Brand New Article',
            url: 'https://example.com/brand-new',
            minutes: 5,
            status: 'pending',
            created_at: '2026-10-24T12:00:00Z',
          },
          // 3. Duplicate of item 2 within the same batch!
          {
            id: 'import-3',
            type: 'link',
            title: 'Duplicate in Batch',
            url: 'https://example.com/brand-new?utm_campaign=share',
            minutes: 5,
            status: 'pending',
            created_at: '2026-10-24T12:00:00Z',
          },
        ],
      },
    };

    const result = await restoreBackupData(backup);

    expect(result.success).toBe(true);
    expect(result.restoredCount).toBe(1); // Only Brand New Article inserted
    expect(result.skippedDuplicates).toBe(2); // 1 DB duplicate + 1 Batch duplicate skipped

    expect(itemsTable.some((i) => i.title === 'Brand New Article')).toBe(true);
    expect(itemsTable.some((i) => i.title === 'Duplicate from DB')).toBe(false);
    expect(itemsTable.some((i) => i.title === 'Duplicate in Batch')).toBe(false);
  });

  // 5. Oversized file
  test('rejects backup files exceeding size limit', () => {
    // Construct dummy large string exceeding MAX_BACKUP_SIZE_BYTES
    const largeHeader = '{"version":1,"data":{"items":[]},"padding":"';
    const oversizedLength = MAX_BACKUP_SIZE_BYTES + 50;

    const oversizedString = {
      length: oversizedLength,
      slice: () => '',
    } as any;

    expect(() => parseAndValidateBackupString(oversizedString)).toThrow(
      /Backup file exceeds maximum allowed size/
    );
  });

  // 6. Mid-import failure leaves existing data untouched (transaction rollback)
  test('simulated mid-import failure leaves pre-existing data completely untouched', async () => {
    const initialItemCount = itemsTable.length;
    const initialCollectionCount = collectionsTable.length;

    // Force runAsync to fail after inserting one item
    let insertCalls = 0;
    mockDb.runAsync = jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('INSERT INTO items')) {
        insertCalls++;
        if (insertCalls === 2) {
          throw new Error('SIMULATED_DISK_WRITE_FAILURE');
        }
        itemsTable.push({ id: params?.[0], title: params?.[2] });
      }
    });

    const backup: ReMindBackup = {
      version: 1,
      exported_at: '2026-10-24T12:00:00Z',
      app_name: 'Re:Mind',
      data: {
        collections: [{ id: 'col-new', name: 'New Col', created_at: '' }],
        items: [
          { id: 'item-1', type: 'link', title: 'Item 1', minutes: 5, status: 'pending', created_at: '' },
          { id: 'item-2', type: 'link', title: 'Item 2 (Will Fail)', minutes: 5, status: 'pending', created_at: '' },
        ],
      },
    };

    await expect(restoreBackupData(backup)).rejects.toThrow('SIMULATED_DISK_WRITE_FAILURE');

    // Existing data is left completely intact
    expect(itemsTable.length).toBe(initialItemCount);
    expect(itemsTable[0].id).toBe('existing-1');
    expect(collectionsTable.length).toBe(initialCollectionCount);
  });

  // 7. Security: never writes password or secret fields
  test('sanitizes and never imports password or secret fields', async () => {
    const backup: any = {
      version: 1,
      exported_at: '2026-10-24T12:00:00Z',
      app_name: 'Re:Mind',
      data: {
        collections: [],
        items: [
          {
            id: 'item-sec',
            type: 'text',
            title: 'Clean Item',
            user_password: 'injected_password',
            secret: 'injected_secret',
            token: 'injected_token',
            minutes: 1,
            status: 'pending',
            created_at: '2026-10-24T12:00:00Z',
          },
        ],
      },
    };

    await restoreBackupData(backup);

    const inserted = itemsTable.find((i) => i.id === 'item-sec');
    expect(inserted).toBeDefined();
    expect((inserted as any).user_password).toBeUndefined();
    expect((inserted as any).secret).toBeUndefined();
    expect((inserted as any).token).toBeUndefined();
  });

  // 8. Items without minutes (null or omitted) import fine with defaults, while invalid values are rejected
  test('items without minutes (null or omitted) validate and import successfully with default minutes', async () => {
    const backup: ReMindBackup = {
      version: 1,
      exported_at: '2026-10-24T12:00:00Z',
      app_name: 'Re:Mind',
      data: {
        collections: [],
        items: [
          // 1. Explicit null minutes
          {
            id: 'item-null-minutes',
            type: 'link',
            title: 'Article With Null Minutes',
            url: 'https://example.com/null-min',
            minutes: null as any,
            status: 'pending',
            created_at: '2026-10-24T12:00:00Z',
          },
          // 2. Omitted minutes (undefined)
          {
            id: 'item-no-minutes',
            type: 'task',
            title: 'Task With Omitted Minutes',
            status: 'pending',
            created_at: '2026-10-24T12:00:00Z',
          } as any,
        ],
      },
    };

    // Validation must pass
    expect(() => validateBackupData(backup)).not.toThrow();

    // Import must succeed
    const result = await restoreBackupData(backup);
    expect(result.success).toBe(true);
    expect(result.restoredCount).toBe(2);

    const nullItem = itemsTable.find((i) => i.id === 'item-null-minutes');
    expect(nullItem).toBeDefined();
    expect(nullItem.minutes).toBe(5); // DEFAULT_ITEM_MINUTES['link']

    const omittedItem = itemsTable.find((i) => i.id === 'item-no-minutes');
    expect(omittedItem).toBeDefined();
    expect(omittedItem.minutes).toBe(15); // DEFAULT_ITEM_MINUTES['task']
  });

  test('rejects items with invalid minutes values outside 1, 5, 15, 30', () => {
    const invalidMinutesBackup = {
      version: 1,
      data: {
        items: [
          {
            title: 'Invalid Minutes Item',
            type: 'link',
            minutes: 42, // Not in [1, 5, 15, 30]
          },
        ],
      },
    };
    expect(() => validateBackupData(invalidMinutesBackup)).toThrow(
      /Invalid item record at index 0: "minutes" must be 1, 5, 15, 30 or null\/omitted\./
    );
  });

  // 9. Settings import strictly enforces user preference whitelist and ignores internal keys
  test('settings import strictly enforces user preference whitelist and ignores internal keys', async () => {
    const backup: any = {
      version: 1,
      exported_at: '2026-10-24T12:00:00Z',
      app_name: 'Re:Mind',
      data: {
        settings: {
          // Whitelisted preference keys:
          nudge_frequency: 'daily',
          nudge_time: '20:00',
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          default_chip: 15,
          onboarding_completed: 'true',
          // FORBIDDEN internal / secret keys:
          debug_logs: 'SIMULATED_LEAKED_LOGS',
          notification_prompted: 'true',
          user_password: 'super_secret_password',
          internal_cache_key: 'cache_123',
        },
        collections: [],
        items: [],
      },
    };

    const result = await restoreBackupData(backup);
    expect(result.success).toBe(true);

    const savedKeys = settingsTable.map((s) => s.key);
    expect(savedKeys).toContain('nudge_frequency');
    expect(savedKeys).toContain('nudge_time');
    expect(savedKeys).toContain('quiet_hours_start');
    expect(savedKeys).toContain('quiet_hours_end');
    expect(savedKeys).toContain('default_chip');
    expect(savedKeys).toContain('onboarding_completed');

    // Never write internal or secret keys
    expect(savedKeys).not.toContain('debug_logs');
    expect(savedKeys).not.toContain('notification_prompted');
    expect(savedKeys).not.toContain('user_password');
    expect(savedKeys).not.toContain('internal_cache_key');
  });

  // 10. Fresh surfaced/snooze state for pending items vs preserved terminal state
  test('restored pending items receive fresh surfaced/snooze state while completed items preserve terminal status', async () => {
    const backup: ReMindBackup = {
      version: 1,
      exported_at: '2026-10-24T12:00:00Z',
      app_name: 'Re:Mind',
      data: {
        collections: [],
        items: [
          // Pending item with old snooze / surface timestamps from past device
          {
            id: 'item-pending-stale',
            type: 'link',
            title: 'Stale Pending Item',
            url: 'https://example.com/stale-pending',
            minutes: 5,
            status: 'pending',
            created_at: '2026-01-01T10:00:00Z',
            times_surfaced: 7,
            snoozed_until: '2026-01-15T00:00:00Z',
            resurfaced_at: '2026-01-10T00:00:00Z',
          },
          // Done item with historical terminal timestamps
          {
            id: 'item-done-historical',
            type: 'link',
            title: 'Historical Done Item',
            url: 'https://example.com/done-hist',
            minutes: 5,
            status: 'done',
            created_at: '2026-01-01T10:00:00Z',
            done_at: '2026-01-02T15:30:00Z',
            times_surfaced: 3,
            resurfaced_at: '2026-01-02T15:00:00Z',
          },
        ],
      },
    };

    await restoreBackupData(backup);

    const restoredPending = itemsTable.find((i) => i.id === 'item-pending-stale');
    expect(restoredPending).toBeDefined();
    // Fresh state for pending items to avoid being suppressed in downtime queue
    expect(restoredPending.times_surfaced).toBe(0);
    expect(restoredPending.snoozed_until).toBeNull();
    expect(restoredPending.resurfaced_at).toBeNull();

    const restoredDone = itemsTable.find((i) => i.id === 'item-done-historical');
    expect(restoredDone).toBeDefined();
    // Preserved terminal state for done items
    expect(restoredDone.status).toBe('done');
    expect(restoredDone.done_at).toBe('2026-01-02T15:30:00Z');
    expect(restoredDone.times_surfaced).toBe(3);
  });

  // 11. Round-trip settings test: sets each preference setting, exports, wipes DB, imports, and compares
  test('round-trip settings test: sets each preference setting, exports, wipes DB, imports, and verifies complete fidelity', async () => {
    const { settingsRepo } = require('../../db/settingsRepo');

    // 1. Set each whitelisted user preference setting
    await settingsRepo.saveSettings({
      nudge_frequency: 'weekly',
      nudge_time: '21:45',
      quiet_hours_start: '23:30',
      quiet_hours_end: '07:15',
      onboarding_completed: true,
      default_chip: 15,
    });

    // Also set internal runtime keys in the mock settings table to verify they do NOT round-trip
    await settingsRepo.setNotificationPrompted(true);
    settingsTable.push({ key: 'debug_logs', value: 'internal_log_trace' });

    const beforeSettings = await settingsRepo.getSettings();
    expect(beforeSettings.nudge_frequency).toBe('weekly');
    expect(beforeSettings.nudge_time).toBe('21:45');
    expect(beforeSettings.quiet_hours_start).toBe('23:30');
    expect(beforeSettings.quiet_hours_end).toBe('07:15');
    expect(beforeSettings.onboarding_completed).toBe(true);
    expect(beforeSettings.default_chip).toBe(15);

    // 2. Export (generates sanitized backup data)
    const backup = await generateBackupData();
    expect(backup.data.settings).toBeDefined();
    expect(backup.data.settings).toEqual({
      nudge_frequency: 'weekly',
      nudge_time: '21:45',
      quiet_hours_start: '23:30',
      quiet_hours_end: '07:15',
      onboarding_completed: true,
      default_chip: 15,
    });
    // Internal keys must NOT be present in exported backup
    expect((backup.data.settings as any).debug_logs).toBeUndefined();
    expect((backup.data.settings as any).notification_prompted).toBeUndefined();

    // 3. Wipe database settings
    settingsTable = [];
    const wipedSettings = await settingsRepo.getSettings();
    // After wiping, settingsRepo returns DEFAULT_SETTINGS
    expect(wipedSettings.nudge_frequency).toBe('daily');
    expect(wipedSettings.nudge_time).toBe('19:00');
    expect(wipedSettings.default_chip).toBe(5);

    // 4. Import via restoreBackupData
    const restoreResult = await restoreBackupData(backup);
    expect(restoreResult.success).toBe(true);

    // 5. Compare: verify restored settings match the exact configured preferences
    const afterSettings = await settingsRepo.getSettings();
    expect(afterSettings.nudge_frequency).toBe('weekly');
    expect(afterSettings.nudge_time).toBe('21:45');
    expect(afterSettings.quiet_hours_start).toBe('23:30');
    expect(afterSettings.quiet_hours_end).toBe('07:15');
    expect(afterSettings.onboarding_completed).toBe(true);
    expect(afterSettings.default_chip).toBe(15);

    // Internal keys remain untouched / absent
    expect(await settingsRepo.isNotificationPrompted()).toBe(false);
    expect(settingsTable.find((s) => s.key === 'debug_logs')).toBeUndefined();
  });
});
