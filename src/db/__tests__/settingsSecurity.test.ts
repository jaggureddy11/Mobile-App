import { migratePurgePassword, setTestDatabase } from '../database';
import { settingsRepo } from '../settingsRepo';
import { syncService } from '../../platform/syncService';
import { itemsRepo } from '../itemsRepo';
import { collectionsRepo } from '../collectionsRepo';

jest.mock('../itemsRepo');
jest.mock('../collectionsRepo');

describe('Security: Password Purge & Settings Rebuild', () => {
  let mockDb: any;
  let mockStore: Record<string, string>;

  beforeEach(() => {
    mockStore = {
      nudge_frequency: 'daily',
      nudge_time: '19:00',
      user_password: 'supersecretpassword123',
      user_email: 'test@example.com',
    };

    mockDb = {
      getAllAsync: jest.fn().mockImplementation(async (sql: string) => {
        if (sql.includes('PRAGMA table_info')) {
          return [{ name: 'key' }, { name: 'value' }];
        }
        if (sql.includes('SELECT key, value FROM settings')) {
          return Object.entries(mockStore).map(([key, value]) => ({ key, value }));
        }
        return [];
      }),
      getFirstAsync: jest.fn().mockImplementation(async (sql: string) => {
        if (sql.includes("key = 'user_password'")) {
          return { count: mockStore.user_password ? 1 : 0 };
        }
        return null;
      }),
      execAsync: jest.fn().mockImplementation(async (sql: string) => {
        if (sql.includes("DELETE FROM settings WHERE key = 'user_password'")) {
          delete mockStore.user_password;
        }
        return undefined;
      }),
      runAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes("DELETE FROM settings WHERE key = 'user_password'")) {
          delete mockStore.user_password;
        }
        if (params && sql.includes('INSERT OR REPLACE INTO settings')) {
          mockStore[params[0]] = params[1];
        }
        return undefined;
      }),
      withTransactionAsync: jest.fn().mockImplementation(async (cb: () => Promise<any>) => {
        return await cb();
      }),
    };

    setTestDatabase(mockDb);
  });

  afterEach(() => {
    setTestDatabase(null);
  });

  it('runs migratePurgePassword to set password to empty and rebuild settings table without user_password', async () => {
    expect(mockStore.user_password).toBe('supersecretpassword123');
    await migratePurgePassword(mockDb);

    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM settings WHERE key = 'user_password'")
    );
    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS settings_clean")
    );
    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("ALTER TABLE settings_clean RENAME TO settings")
    );
    expect(mockStore.user_password).toBeUndefined();
  });

  it('settingsRepo.getSettings never returns user_password', async () => {
    delete mockStore.user_password;
    const settings = await settingsRepo.getSettings();
    expect((settings as any).user_password).toBeUndefined();
    expect(settings.user_email).toBe('test@example.com');
  });

  it('settingsRepo.saveSettings does not persist user_password', async () => {
    const updated = await settingsRepo.saveSettings({
      nudge_frequency: 'weekly',
    } as any);

    expect((updated as any).user_password).toBeUndefined();
    expect(mockStore.user_password).toBeUndefined();
  });

  it('syncService payload contains items and collections, never settings or passwords', async () => {
    (itemsRepo.getAll as jest.Mock).mockResolvedValue([
      { id: '1', title: 'Test Item', minutes: 5, status: 'pending', created_at: '2026-01-01T00:00:00.000Z' },
    ]);
    (collectionsRepo.getAll as jest.Mock).mockResolvedValue([]);

    const payload = await syncService.generatePayload();
    expect(payload.items).toHaveLength(1);
    expect((payload as any).settings).toBeUndefined();
    expect((payload as any).user_password).toBeUndefined();
    expect((payload as any).passwords).toBeUndefined();
  });
});
