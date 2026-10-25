import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  setupNotificationChannels,
  requestNotificationPermission,
  scheduleNudgeNotification,
  sendTestNotification,
  NUDGE_CHANNEL_ID,
} from '../notifications';
import { DEFAULT_SETTINGS, UserSettings } from '../../domain/types';

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

describe('Notifications Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setupNotificationChannels', () => {
    it('sets up Android notification channel on Android', async () => {
      const origOS = Platform.OS;
      (Platform as any).OS = 'android';

      await setupNotificationChannels();

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        NUDGE_CHANNEL_ID,
        expect.objectContaining({
          name: 'Gentle Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          lightColor: '#D4C4B0',
          sound: 'default',
        })
      );

      (Platform as any).OS = origOS;
    });

    it('does not throw on iOS or non-Android platform', async () => {
      const origOS = Platform.OS;
      (Platform as any).OS = 'ios';

      await expect(setupNotificationChannels()).resolves.not.toThrow();

      (Platform as any).OS = origOS;
    });
  });

  describe('requestNotificationPermission', () => {
    it('returns true when permission is already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      const granted = await requestNotificationPermission();
      expect(granted).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requests permission and returns true when newly granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      const granted = await requestNotificationPermission();
      expect(granted).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('returns false when permission request is denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      const granted = await requestNotificationPermission();
      expect(granted).toBe(false);
    });
  });

  describe('scheduleNudgeNotification', () => {
    it('cancels existing notifications and skips scheduling when frequency is never', async () => {
      const settings: UserSettings = {
        ...DEFAULT_SETTINGS,
        nudge_frequency: 'never',
      };

      await scheduleNudgeNotification(settings);

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('does not schedule notification if permissions are not granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      const settings: UserSettings = {
        ...DEFAULT_SETTINGS,
        nudge_frequency: 'daily',
      };

      await scheduleNudgeNotification(settings);

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('schedules daily notification with channelId when granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      const settings: UserSettings = {
        ...DEFAULT_SETTINGS,
        nudge_frequency: 'daily',
        nudge_time: '20:30',
      };

      await scheduleNudgeNotification(settings);

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.objectContaining({
          title: 'Re:Mind',
          body: expect.any(String),
          data: { screen: 'today' },
          sound: true,
        }),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20,
          minute: 30,
          channelId: NUDGE_CHANNEL_ID,
        },
      });
    });

    it('schedules weekly notification with channelId when frequency is weekly', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      const settings: UserSettings = {
        ...DEFAULT_SETTINGS,
        nudge_frequency: 'weekly',
        nudge_time: '18:00',
      };

      await scheduleNudgeNotification(settings);

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.objectContaining({
          title: 'Re:Mind',
          body: expect.any(String),
          data: { screen: 'today' },
          sound: true,
        }),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 1,
          hour: 18,
          minute: 0,
          channelId: NUDGE_CHANNEL_ID,
        },
      });
    });
  });

  describe('sendTestNotification', () => {
    it('schedules a 2-second test notification when permission is granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const result = await sendTestNotification();

      expect(result).toBe(true);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.objectContaining({
          title: 'Re:Mind Sanctuary',
          body: expect.stringContaining('Gentle notification test'),
          data: { screen: 'today' },
          sound: true,
        }),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
          channelId: NUDGE_CHANNEL_ID,
        },
      });
    });

    it('returns false when permission is denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const result = await sendTestNotification();
      expect(result).toBe(false);
    });

    it('returns false and does not throw when scheduleNotificationAsync fails', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValueOnce(
        new Error('OS Notification Service Error')
      );

      const result = await sendTestNotification();
      expect(result).toBe(false);
    });
  });

  describe('getNotificationPermissionStatus', () => {
    it('returns permission status from expo-notifications', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });
      const { getNotificationPermissionStatus } = require('../notifications');
      const status = await getNotificationPermissionStatus();
      expect(status).toBe('granted');
    });

    it('returns undetermined if getPermissionsAsync throws', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Permission check error')
      );
      const { getNotificationPermissionStatus } = require('../notifications');
      const status = await getNotificationPermissionStatus();
      expect(status).toBe('undetermined');
    });
  });

  describe('scheduleNudgeNotification error resilience', () => {
    it('handles unexpected schedule error gracefully without crashing', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Schedule failure')
      );

      const settings: UserSettings = {
        ...DEFAULT_SETTINGS,
        nudge_frequency: 'daily',
        nudge_time: '19:00',
      };

      await expect(scheduleNudgeNotification(settings)).resolves.not.toThrow();
    });

    it('defaults to 19:00 if nudge_time format is missing or invalid', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      const settings: UserSettings = {
        ...DEFAULT_SETTINGS,
        nudge_frequency: 'daily',
        nudge_time: '' as any,
      };

      await scheduleNudgeNotification(settings);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({
            hour: 19,
            minute: 0,
          }),
        })
      );
    });
  });
});

