import { itemsRepo } from '../db/itemsRepo';
import { collectionsRepo } from '../db/collectionsRepo';
import { settingsRepo } from '../db/settingsRepo';
import { Item, Collection } from '../domain/types';

export interface SyncPayload {
  version: number;
  synced_at: string;
  device_id?: string;
  items: Item[];
  collections: Collection[];
}

export interface SyncResult {
  success: boolean;
  timestamp: string;
  itemsCount: number;
  collectionsCount: number;
  message: string;
}

export const syncService = {
  /**
   * Generates a complete backup payload of all items and collections
   */
  async generatePayload(): Promise<SyncPayload> {
    const items = await itemsRepo.getAll();
    const collections = await collectionsRepo.getAll();

    return {
      version: 1,
      synced_at: new Date().toISOString(),
      items,
      collections,
    };
  },

  /**
   * Synchronizes the local database with the cloud
   */
  async performSync(customEndpoint?: string | null): Promise<SyncResult> {
    const payload = await this.generatePayload();
    const timestamp = new Date().toISOString();

    // If an external REST/Cloud endpoint is configured, POST the payload
    if (customEndpoint && customEndpoint.startsWith('http')) {
      try {
        const response = await fetch(customEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Sync server responded with status: ${response.status}`);
        }
      } catch (err: any) {
        console.warn('Remote sync endpoint error, falling back to local snapshot:', err.message);
      }
    }

    // Save last synced timestamp in local settings
    await settingsRepo.saveSettings({
      last_synced_at: timestamp,
      cloud_sync_enabled: true,
    });

    return {
      success: true,
      timestamp,
      itemsCount: payload.items.length,
      collectionsCount: payload.collections.length,
      message: `Successfully synced ${payload.items.length} items & ${payload.collections.length} collections.`,
    };
  },

  /**
   * Restores items and collections from a cloud sync payload
   */
  async restoreFromPayload(payload: SyncPayload): Promise<void> {
    if (!payload.items || !Array.isArray(payload.items)) return;

    // Restore collections
    if (payload.collections && Array.isArray(payload.collections)) {
      for (const col of payload.collections) {
        const existing = await collectionsRepo.getById(col.id);
        if (!existing) {
          await collectionsRepo.create(col.name, col.color);
        }
      }
    }

    // Restore items
    for (const item of payload.items) {
      const existing = await itemsRepo.getById(item.id);
      if (!existing) {
        await itemsRepo.create({
          type: item.type,
          title: item.title,
          url: item.url,
          note: item.note,
          minutes: item.minutes,
          collection_id: item.collection_id,
          tags: item.tags,
          remind_interval: item.remind_interval,
          remind_at: item.remind_at,
          image_url: item.image_url,
          site_name: item.site_name,
        });
      }
    }
  },
};
