import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Share } from 'react-native';
import TodayScreen from '../today';
import SavedScreen from '../saved';
import SettingsScreen from '../settings';
import * as databaseModule from '@/db/database';
import { debugLogger } from '@/utils/debugLogger';

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy({}, {
    get: () => (props: any) => React.createElement(View, props),
  });
});

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));

jest.mock('@/platform/useListenShareIntent', () => ({
  useListenShareIntent: jest.fn(),
}));

jest.mock('@/db/itemsRepo', () => ({
  itemsRepo: {
    getAll: jest.fn(() => Promise.resolve([])),
    create: jest.fn((item) => Promise.resolve({ id: 'created-id', ...item })),
    recordSurfaceEvent: jest.fn(() => Promise.resolve('event-1')),
    recordSurfaceAction: jest.fn(() => Promise.resolve(undefined)),
    updateStatus: jest.fn(() => Promise.resolve(undefined)),
    deleteMultiple: jest.fn(() => Promise.resolve(undefined)),
  },
}));

jest.mock('@/db/collectionsRepo', () => ({
  collectionsRepo: {
    getAll: jest.fn(() => Promise.resolve([])),
    create: jest.fn(() => Promise.resolve('col-1')),
    delete: jest.fn(() => Promise.resolve(undefined)),
  },
}));

jest.mock('@/db/settingsRepo', () => ({
  settingsRepo: {
    getSettings: jest.fn(() => Promise.resolve({
      nudge_frequency: 'daily',
      nudge_time: '19:00',
      cloud_sync_enabled: false,
      last_synced_at: null,
      notification_prompted: true,
    })),
    updateSettings: jest.fn(() => Promise.resolve(undefined)),
  },
}));

describe('Migration Error Notice on Tab Screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    databaseModule.setStartupMigrationError(null);
  });

  afterEach(() => {
    databaseModule.setStartupMigrationError(null);
  });

  describe('TodayScreen', () => {
    it('shows normal state when no migration error', async () => {
      databaseModule.setStartupMigrationError(null);
      const screen = await render(<TodayScreen />);
      expect(screen.queryByTestId('database-update-notice')).toBeNull();
      // Should show normal state
      expect(screen.getByText(/Nothing saved yet|All caught up/i)).toBeTruthy();
    });

    it('shows DatabaseUpdateNotice when startupMigrationError is set', async () => {
      databaseModule.setStartupMigrationError('Schema migration lock failed');
      const screen = await render(<TodayScreen />);

      expect(screen.getByTestId('database-update-notice')).toBeTruthy();
      expect(screen.getByText('Database Update Notice')).toBeTruthy();
      expect(screen.getByText('Retry loading')).toBeTruthy();
      // Must NOT show normal empty state
      expect(screen.queryByText(/Nothing saved yet|All caught up/i)).toBeNull();
    });

    it('retrying invokes retryDatabaseInitialization exactly once on tap, not on mount', async () => {
      databaseModule.setStartupMigrationError('Transient lock error on today');
      const retrySpy = jest.spyOn(databaseModule, 'retryDatabaseInitialization').mockImplementation(async () => {
        databaseModule.setStartupMigrationError(null);
      });

      const screen = await render(<TodayScreen />);
      expect(screen.getByTestId('database-update-notice')).toBeTruthy();

      // Must NOT be called yet — DatabaseUpdateNotice must not trigger retry on mount.
      expect(retrySpy).toHaveBeenCalledTimes(0);

      await act(async () => {
        fireEvent.press(screen.getByTestId('retry-loading-button'));
      });

      // Must be called exactly once after the tap — not twice.
      expect(retrySpy).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('database-update-notice')).toBeNull();
      expect(screen.getByText(/Nothing saved yet|All caught up/i)).toBeTruthy();

      retrySpy.mockRestore();
    });
  });

  describe('SavedScreen (Saved Items and Collections)', () => {
    it('shows normal view when no migration error', async () => {
      databaseModule.setStartupMigrationError(null);
      const screen = await render(<SavedScreen />);
      expect(screen.queryByTestId('database-update-notice')).toBeNull();
      expect(screen.getByText('All Items')).toBeTruthy();
      // Tab label renders with count: "Collections (0)"
      expect(screen.getByText(/Collections/)).toBeTruthy();
    });

    it('shows DatabaseUpdateNotice instead of empty state when startupMigrationError is set', async () => {
      databaseModule.setStartupMigrationError('Disk I/O error during migration');
      const screen = await render(<SavedScreen />);

      expect(screen.getByTestId('database-update-notice')).toBeTruthy();
      expect(screen.getByText('Database Update Notice')).toBeTruthy();
      expect(screen.getByText('Retry loading')).toBeTruthy();
      // Normal switcher tabs must not be visible while database is in error
      expect(screen.queryByText('All Items')).toBeNull();
    });

    it('retrying invokes retryDatabaseInitialization exactly once on tap from saved items view', async () => {
      databaseModule.setStartupMigrationError('Disk I/O error during migration');
      const retrySpy = jest.spyOn(databaseModule, 'retryDatabaseInitialization').mockImplementation(async () => {
        databaseModule.setStartupMigrationError(null);
      });

      const screen = await render(<SavedScreen />);
      expect(screen.getByTestId('database-update-notice')).toBeTruthy();

      // Must NOT be called yet on render
      expect(retrySpy).toHaveBeenCalledTimes(0);

      await act(async () => {
        fireEvent.press(screen.getByTestId('retry-loading-button'));
      });

      // Must be called exactly once
      expect(retrySpy).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('database-update-notice')).toBeNull();
      expect(screen.getByText('All Items')).toBeTruthy();

      retrySpy.mockRestore();
    });

    it('retrying recovers database and restores collections view access', async () => {
      databaseModule.setStartupMigrationError('Migration failure on collections');
      const retrySpy = jest.spyOn(databaseModule, 'retryDatabaseInitialization').mockImplementation(async () => {
        databaseModule.setStartupMigrationError(null);
      });

      const screen = await render(<SavedScreen />);
      expect(screen.getByTestId('database-update-notice')).toBeTruthy();

      // Must NOT be called on render
      expect(retrySpy).toHaveBeenCalledTimes(0);

      await act(async () => {
        fireEvent.press(screen.getByTestId('retry-loading-button'));
      });

      // Exactly once after tap
      expect(retrySpy).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('database-update-notice')).toBeNull();

      // Switch to Collections tab to verify collections view is accessible after recovery
      await act(async () => {
        fireEvent.press(screen.getByText(/Collections/));
      });
      expect(screen.getByText('New Collection')).toBeTruthy();

      retrySpy.mockRestore();
    });
  });

  describe('SettingsScreen', () => {
    it('shows normal settings when no migration error', async () => {
      databaseModule.setStartupMigrationError(null);
      const screen = await render(<SettingsScreen />);
      expect(screen.queryByTestId('database-update-notice')).toBeNull();
      expect(screen.getByText('DATA & FREEDOM')).toBeTruthy();
    });

    it('shows DatabaseUpdateNotice when startupMigrationError is set', async () => {
      databaseModule.setStartupMigrationError('Corrupted settings migration');
      const screen = await render(<SettingsScreen />);

      expect(screen.getByTestId('database-update-notice')).toBeTruthy();
      expect(screen.getByText('Database Update Notice')).toBeTruthy();
      expect(screen.getByText('Retry loading')).toBeTruthy();
      // Normal settings sections must not be shown
      expect(screen.queryByText('DATA & FREEDOM')).toBeNull();
    });

    it('retrying invokes retryDatabaseInitialization exactly once on tap, not on mount', async () => {
      databaseModule.setStartupMigrationError('Transient lock error');
      const retrySpy = jest.spyOn(databaseModule, 'retryDatabaseInitialization').mockImplementation(async () => {
        databaseModule.setStartupMigrationError(null);
      });

      const screen = await render(<SettingsScreen />);
      expect(screen.getByTestId('database-update-notice')).toBeTruthy();

      // Must NOT be called yet — DatabaseUpdateNotice must not trigger retry on mount.
      expect(retrySpy).toHaveBeenCalledTimes(0);

      await act(async () => {
        fireEvent.press(screen.getByTestId('retry-loading-button'));
      });

      // Must be called exactly once after the tap — not twice.
      expect(retrySpy).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('database-update-notice')).toBeNull();
      expect(screen.getByText('DATA & FREEDOM')).toBeTruthy();

      retrySpy.mockRestore();
    });
  });

  describe('DatabaseUpdateNotice "Copy debug info"', () => {
    it('shares in-memory debug log buffer when database is unavailable, containing only error_name, screen, and timestamp', async () => {
      // 1. Force database to be completely unavailable
      databaseModule.setStartupMigrationError('Disk I/O failure: SQLite cannot be reached');
      await expect(databaseModule.getDatabase()).rejects.toThrow('Database unavailable');

      // 2. Clear debugLogger and log in-memory errors
      await debugLogger.clear();
      debugLogger.logError('TodayScreen', new TypeError('Fatal crash on startup'));
      debugLogger.logError('DatabaseMigration', new RangeError('Index out of bounds'));

      const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);

      // 3. Render screen displaying DatabaseUpdateNotice
      const screen = await render(<TodayScreen />);
      expect(screen.getByTestId('database-update-notice')).toBeTruthy();
      expect(screen.getByTestId('copy-debug-info-button')).toBeTruthy();

      // 4. Tap "Copy debug info"
      await act(async () => {
        fireEvent.press(screen.getByTestId('copy-debug-info-button'));
      });

      // 5. Verify share was called without touching database
      expect(shareSpy).toHaveBeenCalledTimes(1);
      const sharedMessage = shareSpy.mock.calls[0][0].message;
      expect(sharedMessage).toBeTruthy();

      // 6. Verify contents contains only error_name, screen, timestamp in errors
      const parsed = JSON.parse(sharedMessage!);
      expect(parsed.errors).toHaveLength(2);

      for (const err of parsed.errors) {
        expect(Object.keys(err).sort()).toEqual(['error_name', 'screen', 'timestamp']);
      }
      expect(parsed.errors[0].error_name).toBe('TypeError');
      expect(parsed.errors[0].screen).toBe('TodayScreen');
      expect(parsed.errors[0].timestamp).toBeDefined();

      expect(parsed.errors[1].error_name).toBe('RangeError');
      expect(parsed.errors[1].screen).toBe('DatabaseMigration');
      expect(parsed.errors[1].timestamp).toBeDefined();

      shareSpy.mockRestore();
    });
  });
});
