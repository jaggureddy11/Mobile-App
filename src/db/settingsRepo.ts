import { getDatabase } from './database';
import { UserSettings, DEFAULT_SETTINGS } from '../domain/types';

export const settingsRepo = {
  async getSettings(): Promise<UserSettings> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings'
    );

    if (rows.length === 0) {
      // Initialize with defaults directly without calling getSettings again
      await db.withTransactionAsync(async () => {
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
          await db.runAsync(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
            [key, String(value)]
          );
        }
      });
      return DEFAULT_SETTINGS;
    }

    const settingsMap = new Map(rows.map((r) => [r.key, r.value]));

    return {
      nudge_frequency: (settingsMap.get('nudge_frequency') as UserSettings['nudge_frequency']) ?? DEFAULT_SETTINGS.nudge_frequency,
      nudge_time: settingsMap.get('nudge_time') ?? DEFAULT_SETTINGS.nudge_time,
      quiet_hours_start: settingsMap.get('quiet_hours_start') ?? DEFAULT_SETTINGS.quiet_hours_start,
      quiet_hours_end: settingsMap.get('quiet_hours_end') ?? DEFAULT_SETTINGS.quiet_hours_end,
      onboarding_completed: settingsMap.get('onboarding_completed') === 'true',
      user_email: settingsMap.get('user_email') || null,
      user_password: settingsMap.get('user_password') || null,
      cloud_sync_enabled: settingsMap.has('cloud_sync_enabled') ? settingsMap.get('cloud_sync_enabled') === 'true' : DEFAULT_SETTINGS.cloud_sync_enabled,
      last_synced_at: settingsMap.get('last_synced_at') || null,
      sync_endpoint: settingsMap.get('sync_endpoint') || null,
    };
  },

  async saveSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const db = await getDatabase();
    
    // Read raw rows directly to avoid recursion
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings'
    );
    const settingsMap = new Map(rows.map((r) => [r.key, r.value]));
    const current: UserSettings = {
      nudge_frequency: (settingsMap.get('nudge_frequency') as UserSettings['nudge_frequency']) ?? DEFAULT_SETTINGS.nudge_frequency,
      nudge_time: settingsMap.get('nudge_time') ?? DEFAULT_SETTINGS.nudge_time,
      quiet_hours_start: settingsMap.get('quiet_hours_start') ?? DEFAULT_SETTINGS.quiet_hours_start,
      quiet_hours_end: settingsMap.get('quiet_hours_end') ?? DEFAULT_SETTINGS.quiet_hours_end,
      onboarding_completed: settingsMap.get('onboarding_completed') === 'true',
      user_email: settingsMap.get('user_email') || null,
      user_password: settingsMap.get('user_password') || null,
      cloud_sync_enabled: settingsMap.has('cloud_sync_enabled') ? settingsMap.get('cloud_sync_enabled') === 'true' : DEFAULT_SETTINGS.cloud_sync_enabled,
      last_synced_at: settingsMap.get('last_synced_at') || null,
      sync_endpoint: settingsMap.get('sync_endpoint') || null,
    };

    const updated: UserSettings = { ...current, ...settings };

    await db.withTransactionAsync(async () => {
      for (const [key, value] of Object.entries(updated)) {
        await db.runAsync(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          [key, String(value)]
        );
      }
    });

    return updated;
  },
};
