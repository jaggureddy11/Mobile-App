import { useSettingsStore } from '../useSettingsStore';
import { settingsRepo } from '../../db/settingsRepo';
import { scheduleNudgeNotification } from '../../platform/notifications';

jest.mock('../../db/settingsRepo', () => ({
  settingsRepo: {
    getSettings: jest.fn(),
    saveSettings: jest.fn(),
  },
}));

jest.mock('../../platform/notifications', () => ({
  scheduleNudgeNotification: jest.fn().mockResolvedValue(undefined),
}));

describe('useSettingsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules nudge notification on app open when settings are loaded', async () => {
    const mockSettings = {
      nudge_time: '20:00',
      nudge_frequency: 'daily' as const,
      onboarding_completed: true,
      last_synced_at: null,
      cloud_sync_enabled: false,
    };
    (settingsRepo.getSettings as jest.Mock).mockResolvedValue(mockSettings);

    await useSettingsStore.getState().loadSettings();

    expect(settingsRepo.getSettings).toHaveBeenCalledTimes(1);
    expect(useSettingsStore.getState().settings).toEqual(mockSettings);
    expect(scheduleNudgeNotification).toHaveBeenCalledWith(mockSettings);
  });

  it('re-schedules nudge notification whenever settings are updated', async () => {
    const updatedSettings = {
      nudge_time: '21:30',
      nudge_frequency: 'weekly' as const,
      onboarding_completed: true,
      last_synced_at: null,
      cloud_sync_enabled: false,
    };
    (settingsRepo.saveSettings as jest.Mock).mockResolvedValue(updatedSettings);

    await useSettingsStore.getState().updateSettings({ nudge_time: '21:30', nudge_frequency: 'weekly' });

    expect(settingsRepo.saveSettings).toHaveBeenCalledWith({ nudge_time: '21:30', nudge_frequency: 'weekly' });
    expect(useSettingsStore.getState().settings).toEqual(updatedSettings);
    expect(scheduleNudgeNotification).toHaveBeenCalledWith(updatedSettings);
  });
});
