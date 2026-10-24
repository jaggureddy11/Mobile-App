import { setTestDatabase } from '../database';
import { settingsRepo } from '../settingsRepo';
import { useSettingsStore } from '../../domain/useSettingsStore';

jest.mock('../../platform/notifications', () => ({
  scheduleNudgeNotification: jest.fn().mockResolvedValue(undefined),
}));

describe('Onboarding Persistence on Fresh Install', () => {
  let mockStore: Record<string, string>;
  let mockDb: any;

  beforeEach(() => {
    // 1. Start with an empty SQLite database (fresh install, 0 rows in settings)
    mockStore = {};

    mockDb = {
      getAllAsync: jest.fn().mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT key, value FROM settings')) {
          return Object.entries(mockStore).map(([key, value]) => ({ key, value }));
        }
        return [];
      }),
      runAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
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

  it('starts with empty database, shows onboarding on fresh install, and persists across restart', async () => {
    // Verify database is completely empty on fresh install
    expect(Object.keys(mockStore).length).toBe(0);

    // Initial load on cold start / fresh install
    const freshSettings = await settingsRepo.getSettings();
    expect(freshSettings.onboarding_completed).toBe(false);

    // Decision logic from app/index.tsx (L93-96)
    const getNavRoute = (s: { onboarding_completed?: boolean }) =>
      s?.onboarding_completed === false ? '/onboarding' : '/(tabs)/today';

    expect(getNavRoute(freshSettings)).toBe('/onboarding');

    // User completes onboarding
    await useSettingsStore.getState().completeOnboarding();

    // Verify written to database
    expect(mockStore.onboarding_completed).toBe('true');

    // Simulate app restart / cold start: reset in-memory state and reload from SQLite
    useSettingsStore.setState({
      settings: freshSettings, // reset in-memory
      isLoading: true,
    });

    await useSettingsStore.getState().loadSettings();

    const restoredSettings = useSettingsStore.getState().settings;
    expect(restoredSettings.onboarding_completed).toBe(true);

    // After restart, splash screen now directs to Today screen
    expect(getNavRoute(restoredSettings)).toBe('/(tabs)/today');
  });
});
