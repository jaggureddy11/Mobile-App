import { create } from 'zustand';
import { UserSettings, DEFAULT_SETTINGS } from './types';
import { settingsRepo } from '../db/settingsRepo';
import { scheduleNudgeNotification } from '../platform/notifications';

interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await settingsRepo.getSettings();
      set({ settings, isLoading: false });
      scheduleNudgeNotification(settings).catch(() => {});
    } catch {
      set({ isLoading: false });
    }
  },

  updateSettings: async (newSettings: Partial<UserSettings>) => {
    const updated = await settingsRepo.saveSettings(newSettings);
    set({ settings: updated });
    scheduleNudgeNotification(updated).catch(() => {});
  },

  completeOnboarding: async () => {
    const updated = await settingsRepo.saveSettings({ onboarding_completed: true });
    set({ settings: updated });
    scheduleNudgeNotification(updated).catch(() => {});
  },
}));
