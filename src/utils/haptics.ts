import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Safe haptic feedback wrapper that gracefully falls back on Web,
 * simulator, or unsupported devices without throwing.
 */
export const hapticFeedback = {
  /**
   * Subtle tick feedback for navigation, selecting chips, or tapping tabs.
   */
  selection: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
  },

  /**
   * Light impact for small interactive buttons and toggle states.
   */
  light: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  },

  /**
   * Medium impact for primary actions like Snoozing or Saving.
   */
  medium: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
  },

  /**
   * Satisfying success notification feedback when completing ("Do it") an item.
   */
  success: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
  },

  /**
   * Warning notification feedback for "Let it go" / destructive action.
   */
  warning: () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } catch {}
  },
};
