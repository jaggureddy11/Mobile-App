import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { UserSettings } from '../domain/types';

export const NUDGE_CHANNEL_ID = 'gentle-nudges';

// Configure notification presentation behavior
try {
  if (typeof Notifications?.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch {
  // Graceful fallback in test environments
}

/**
 * Configure Android notification channels.
 * Required for Android 8.0+ (API 26+) so notifications are delivered and displayed properly.
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      if (typeof Notifications?.setNotificationChannelAsync === 'function') {
        await Notifications.setNotificationChannelAsync(NUDGE_CHANNEL_ID, {
          name: 'Gentle Reminders',
          description: 'Calm daily and weekly check-in nudges',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#D4C4B0',
          sound: 'default',
        });
      }
    } catch (e) {
      // Graceful fallback for non-native / test environments
    }
  }
}

// Ensure channel setup is initialized early
setupNotificationChannels().catch(() => {});

export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return (Notifications?.PermissionStatus?.UNDETERMINED || 'undetermined') as Notifications.PermissionStatus;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    await setupNotificationChannels();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleNudgeNotification(settings: UserSettings): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    // Cancel existing scheduled nudges first to prevent duplicates
    if (typeof Notifications?.cancelAllScheduledNotificationsAsync === 'function') {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }

    if (settings.nudge_frequency === 'never') {
      return;
    }

    if (typeof Notifications?.getPermissionsAsync !== 'function') {
      return;
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    await setupNotificationChannels();

    if (typeof Notifications?.scheduleNotificationAsync !== 'function') {
      return;
    }

    const [hourStr, minuteStr] = (settings.nudge_time || '19:00').split(':');
    const hour = parseInt(hourStr, 10) || 19;
    const minute = parseInt(minuteStr, 10) || 0;

    if (settings.nudge_frequency === 'daily') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Re:Mind',
          body: 'Have a minute to take a breather? An item is waiting for you.',
          data: { screen: 'today' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: NUDGE_CHANNEL_ID,
        },
      });
    } else if (settings.nudge_frequency === 'weekly') {
      // Weekly on Sunday
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Re:Mind',
          body: 'Your calm weekly review: one gentle item to enjoy.',
          data: { screen: 'today' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 1, // Sunday
          hour,
          minute,
          channelId: NUDGE_CHANNEL_ID,
        },
      });
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('scheduleNudgeNotification error:', err);
    }
  }
}

/**
 * Fires an immediate test notification (in 2 seconds) for diagnostic and user verification purposes.
 */
export async function sendTestNotification(): Promise<boolean> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return false;

    await setupNotificationChannels();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Re:Mind Sanctuary',
        body: 'Gentle notification test: Your quiet sanctuary is ready.',
        data: { screen: 'today' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        channelId: NUDGE_CHANNEL_ID,
      },
    });

    return true;
  } catch {
    return false;
  }
}

