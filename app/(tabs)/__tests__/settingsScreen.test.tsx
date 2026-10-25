import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import * as Notifications from 'expo-notifications';
import SettingsScreen from '../settings';
import { useSettingsStore } from '@/domain/useSettingsStore';
import { useItemsStore } from '@/domain/useItemsStore';
import { useCollectionsStore } from '@/domain/useCollectionsStore';
import * as backupService from '@/platform/backupService';
import { debugLogger } from '@/utils/debugLogger';
import { DEFAULT_SETTINGS, Item } from '@/domain/types';
import * as databaseModule from '@/db/database';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy({}, {
    get: () => (props: any) => React.createElement(View, props),
  });
});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('test-notification-id'),
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
  },
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    TIME_INTERVAL: 'timeInterval',
  },
}));

jest.mock('@/platform/backupService', () => ({
  exportBackup: jest.fn(),
  importBackup: jest.fn(),
}));

jest.mock('@/db/database', () => ({
  getStartupMigrationError: jest.fn(() => null),
  retryDatabaseInitialization: jest.fn(() => Promise.resolve(true)),
}));

const mockItems: Item[] = [
  {
    id: 'item-1',
    type: 'link',
    title: 'Item 1',
    url: 'https://example.com/1',
    minutes: 5,
    status: 'pending',
    created_at: new Date().toISOString(),
    done_at: null,
    let_go_at: null,
    resurfaced_at: null,
    snoozed_until: null,
    times_surfaced: 0,
  },
  {
    id: 'item-2',
    type: 'task',
    title: 'Item 2',
    url: null,
    minutes: 15,
    status: 'done',
    created_at: new Date().toISOString(),
    done_at: new Date().toISOString(),
    let_go_at: null,
    resurfaced_at: null,
    snoozed_until: null,
    times_surfaced: 1,
  },
];

describe('SettingsScreen (Preferences, Backups, CSV Export & Diagnostics)', () => {
  let screen: any;
  let updateSettingsSpy: jest.Mock;
  let runPurgeSpy: jest.Mock;
  let alertSpy: jest.SpyInstance;
  let shareSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (databaseModule.getStartupMigrationError as jest.Mock).mockReturnValue(null);

    updateSettingsSpy = jest.fn().mockResolvedValue(undefined);
    runPurgeSpy = jest.fn().mockResolvedValue(3);
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);

    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        nudge_frequency: 'daily',
        nudge_time: '19:00',
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
      },
      updateSettings: updateSettingsSpy,
      loadSettings: jest.fn().mockResolvedValue(undefined),
    });

    useItemsStore.setState({
      items: mockItems,
      runPurge: runPurgeSpy,
      loadItems: jest.fn().mockResolvedValue(undefined),
    });

    useCollectionsStore.setState({
      loadCollections: jest.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    if (screen) {
      screen.unmount();
      screen = null;
    }
  });

  it('renders stats card with accurate saved and done counts', async () => {
    screen = await render(<SettingsScreen />);

    expect(screen.getAllByText('1')).toHaveLength(2); // Saved: 1 pending, Done: 1 done
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.getByText('Private')).toBeTruthy();
  });

  it('displays nudge frequency row and cycles daily -> weekly on click', async () => {
    screen = await render(<SettingsScreen />);

    expect(screen.getByText('Nudge frequency')).toBeTruthy();
    expect(screen.getByText('DAILY')).toBeTruthy();

    const frequencyRow = screen.getByText('Nudge frequency');
    await act(async () => {
      fireEvent.press(frequencyRow);
    });

    expect(updateSettingsSpy).toHaveBeenCalledWith({ nudge_frequency: 'weekly' });
  });

  it('cycles frequency weekly -> never when weekly is active', async () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, nudge_frequency: 'weekly' },
    });

    screen = await render(<SettingsScreen />);

    const frequencyRow = screen.getByText('Nudge frequency');
    await act(async () => {
      fireEvent.press(frequencyRow);
    });

    expect(updateSettingsSpy).toHaveBeenCalledWith({ nudge_frequency: 'never' });
  });

  it('cycles frequency never -> daily when never is active', async () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, nudge_frequency: 'never' },
    });

    screen = await render(<SettingsScreen />);

    const frequencyRow = screen.getByText('Nudge frequency');
    await act(async () => {
      fireEvent.press(frequencyRow);
    });

    expect(updateSettingsSpy).toHaveBeenCalledWith({ nudge_frequency: 'daily' });
  });

  it('displays preferred nudge time and cycles to next time slot on click', async () => {
    screen = await render(<SettingsScreen />);

    expect(screen.getByText('Preferred time')).toBeTruthy();
    expect(screen.getByText('19:00')).toBeTruthy();

    const timeRow = screen.getByText('Preferred time');
    await act(async () => {
      fireEvent.press(timeRow);
    });

    // Next time slot after 19:00 in ['09:00', '12:30', '18:00', '19:00', '21:00'] is 21:00
    expect(updateSettingsSpy).toHaveBeenCalledWith({ nudge_time: '21:00' });
  });

  it('displays quiet hours window 22:00 – 08:00', async () => {
    screen = await render(<SettingsScreen />);

    expect(screen.getByText('Quiet hours')).toBeTruthy();
    expect(screen.getByText('22:00 – 08:00')).toBeTruthy();
  });

  it('exports items to CSV spreadsheet and shares via Share.share', async () => {
    screen = await render(<SettingsScreen />);

    const exportCsvRow = screen.getByText('Export Spreadsheet (CSV)');
    await act(async () => {
      fireEvent.press(exportCsvRow);
    });

    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Re:Mind - Exported Items.csv',
        message: expect.stringContaining('id,type,title,url,note,minutes,status,created_at,done_at'),
      })
    );
  });

  it('exports JSON backup and shows success alert with item count', async () => {
    (backupService.exportBackup as jest.Mock).mockResolvedValueOnce({
      success: true,
      itemCount: 42,
    });

    screen = await render(<SettingsScreen />);

    const exportBackupRow = screen.getByText('Backup Data (JSON)');
    await act(async () => {
      fireEvent.press(exportBackupRow);
    });

    expect(backupService.exportBackup).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      'Backup Exported',
      'Exported 42 items to JSON backup file.'
    );
  });

  it('imports JSON backup and reloads items and collections stores', async () => {
    (backupService.importBackup as jest.Mock).mockResolvedValueOnce({
      success: true,
      restoredCount: 15,
    });

    screen = await render(<SettingsScreen />);

    const importBackupRow = screen.getByText('Restore Data (JSON)');
    await act(async () => {
      fireEvent.press(importBackupRow);
    });

    expect(backupService.importBackup).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      'Restore Successful',
      'Successfully restored 15 items from JSON backup.'
    );
  });

  it('runs manual purge and alerts with purged item count', async () => {
    screen = await render(<SettingsScreen />);

    const purgeRow = screen.getByText('Auto-purge status');
    await act(async () => {
      fireEvent.press(purgeRow);
    });

    expect(runPurgeSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      'Cleaned up',
      'Cleaned up 3 items that were let go over 30 days ago.'
    );
  });

  it('copies debug info and shares error diagnostic logs without PII', async () => {
    screen = await render(<SettingsScreen />);

    const copyDebugRow = screen.getByText('Copy debug info');
    await act(async () => {
      fireEvent.press(copyDebugRow);
    });

    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Re:Mind Debug Info',
      })
    );
    expect(alertSpy).toHaveBeenCalledWith(
      'Debug Info',
      expect.stringContaining('No saved items, URLs, or notes are included.')
    );
  });

  it('renders offline-first guarantee card', async () => {
    screen = await render(<SettingsScreen />);

    expect(screen.getByText('Offline-First Guarantee')).toBeTruthy();
    expect(screen.getByText(/Your data and scheduled notifications always run 100% locally/i)).toBeTruthy();
  });

  it('renders DatabaseUpdateNotice if a database migration error exists', async () => {
    (databaseModule.getStartupMigrationError as jest.Mock).mockReturnValueOnce(
      'Database migration failed'
    );

    screen = await render(<SettingsScreen />);

    expect(screen.getByText('Database Update Notice')).toBeTruthy();
  });

  it('triggers test notification and shows confirmation alert when button is pressed', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('test-id');

    screen = await render(<SettingsScreen />);

    const testBtn = screen.getByTestId('test-notification-btn');
    await act(async () => {
      fireEvent.press(testBtn);
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'Re:Mind Sanctuary',
        }),
      })
    );
    expect(alertSpy).toHaveBeenCalledWith(
      'Notification Sent',
      'A gentle test notification has been scheduled and will appear in 2 seconds.'
    );
  });

  it('shows permission alert when test notification button is pressed without permission', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    screen = await render(<SettingsScreen />);

    const testBtn = screen.getByTestId('test-notification-btn');
    await act(async () => {
      fireEvent.press(testBtn);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Permission Required',
      'Notifications are not allowed. Please enable notifications in your device settings.',
      expect.any(Array)
    );
  });

  it('displays notification warning banner when system notifications are disabled', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    screen = await render(<SettingsScreen />);

    // Trigger test notification or frequency change to cause permission to reflect as false
    const testBtn = screen.getByTestId('test-notification-btn');
    await act(async () => {
      fireEvent.press(testBtn);
    });

    expect(screen.getByText('Notifications are disabled')).toBeTruthy();
    expect(screen.getByText('Open device settings')).toBeTruthy();
  });

  it('replays onboarding tour and resets onboarding_completed to false', async () => {
    screen = await render(<SettingsScreen />);

    const replayBtn = screen.getByTestId('replay-onboarding-btn');
    await act(async () => {
      fireEvent.press(replayBtn);
    });

    expect(updateSettingsSpy).toHaveBeenCalledWith({ onboarding_completed: false });
    expect(mockPush).toHaveBeenCalledWith('/onboarding');
  });
});


