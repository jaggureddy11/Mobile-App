import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { UserSettings } from '../domain/types';

// Configure notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function scheduleNudgeNotification(settings: UserSettings): Promise<void> {
  // Cancel existing scheduled nudges first
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (settings.nudge_frequency === 'never') {
    return;
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
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
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } else if (settings.nudge_frequency === 'weekly') {
    // Weekly on Sunday
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Re:Mind',
        body: 'Your calm weekly review: one gentle item to enjoy.',
        data: { screen: 'today' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday
        hour,
        minute,
      },
    });
  }
}
