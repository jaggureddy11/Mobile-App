import {
  parseAndValidateBackupString,
  validateBackupData,
  restoreBackupData,
  MAX_BACKUP_SIZE_BYTES,
  ReMindBackup,
} from '../backupService';
import { setTestDatabase } from '../../db/database';

describe('backupService: Import Validation, Transaction Rollback & Security', () => {
  let mockDb: any;
  let itemsTable: any[];
  let collectionsTable: any[];

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
            normalized_url: params?.[19],
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
        return { changes: 1 };
      }),
      withTransactionAsync: jest.fn().mockImplementation(async (callback: () => Promise<any>) => {
        // Snapshot existing state for rollback simulation
        const itemsSnapshot = JSON.parse(JSON.stringify(itemsTable));
        const collectionsSnapshot = JSON.parse(JSON.stringify(collectionsTable));
        try {
          return await callback();
        } catch (err) {
          // Transaction rollback restores original state
          itemsTable = itemsSnapshot;
          collectionsTable = collectionsSnapshot;
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
});
