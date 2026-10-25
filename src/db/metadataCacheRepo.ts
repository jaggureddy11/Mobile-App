import { getDatabase } from './database';
import { MinuteOption } from '../domain/types';

export interface CachedMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  estimatedMinutes?: MinuteOption;
}

export interface CachedMetadataRecord {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  estimated_minutes: MinuteOption | null;
  cached_at: string;
}

export const METADATA_CACHE_TTL_DAYS = 7;
export const MAX_METADATA_CACHE_ENTRIES = 500;

export const metadataCacheRepo = {
  /**
   * Retrieves cached OpenGraph metadata for a URL from local storage.
   * Discards stale entries older than maxAgeDays.
   */
  async get(
    rawUrl: string,
    maxAgeDays: number = METADATA_CACHE_TTL_DAYS
  ): Promise<CachedMetadata | null> {
    const trimmed = rawUrl?.trim();
    if (!trimmed) return null;

    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<CachedMetadataRecord>(
        'SELECT * FROM metadata_cache WHERE url = ?',
        [trimmed]
      );

      if (!row) return null;

      // Check TTL expiration
      const cachedTime = new Date(row.cached_at).getTime();
      const now = Date.now();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

      if (now - cachedTime >= maxAgeMs) {
        // Expired entry - remove from local storage asynchronously
        db.runAsync('DELETE FROM metadata_cache WHERE url = ?', [trimmed]).catch(() => {});
        return null;
      }

      return {
        title: row.title ?? undefined,
        description: row.description ?? undefined,
        imageUrl: row.image_url ?? undefined,
        siteName: row.site_name ?? undefined,
        estimatedMinutes: row.estimated_minutes
          ? (row.estimated_minutes as MinuteOption)
          : undefined,
      };
    } catch (err: any) {
      if (__DEV__) {
        console.warn('metadataCacheRepo.get error:', err?.message || err);
      }
      return null;
    }
  },

  /**
   * Persists scraped URL metadata into local storage.
   */
  async set(rawUrl: string, meta: CachedMetadata): Promise<void> {
    const trimmed = rawUrl?.trim();
    if (!trimmed) return;

    try {
      const db = await getDatabase();
      const now = new Date().toISOString();

      await db.runAsync(
        `INSERT OR REPLACE INTO metadata_cache (
          url, title, description, image_url, site_name, estimated_minutes, cached_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          trimmed,
          meta.title ?? null,
          meta.description ?? null,
          meta.imageUrl ?? null,
          meta.siteName ?? null,
          meta.estimatedMinutes ?? null,
          now,
        ]
      );

      // Auto-enforce capacity limit to prevent unbounded storage growth
      await this.enforceCapacityLimit(db);
    } catch (err: any) {
      if (__DEV__) {
        console.warn('metadataCacheRepo.set error:', err?.message || err);
      }
    }
  },

  /**
   * Caps the number of cached metadata entries in local storage.
   */
  async enforceCapacityLimit(db: any): Promise<void> {
    try {
      const countRow = (await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM metadata_cache'
      )) as { count: number } | null;
      if (countRow && countRow.count > MAX_METADATA_CACHE_ENTRIES) {
        await db.runAsync(`
          DELETE FROM metadata_cache WHERE url NOT IN (
            SELECT url FROM metadata_cache ORDER BY cached_at DESC LIMIT ${MAX_METADATA_CACHE_ENTRIES}
          )
        `);
      }
    } catch {}
  },

  /**
   * Prunes cached metadata older than the specified age in days.
   */
  async prune(maxAgeDays: number = METADATA_CACHE_TTL_DAYS): Promise<number> {
    try {
      const db = await getDatabase();
      const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
      const res = await db.runAsync('DELETE FROM metadata_cache WHERE cached_at < ?', [cutoff]);
      return res?.changes ?? 0;
    } catch {
      return 0;
    }
  },

  /**
   * Clears all cached metadata from local storage.
   */
  async clear(): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM metadata_cache');
    } catch {}
  },

  /**
   * Returns the count of cached metadata entries.
   */
  async getCount(): Promise<number> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM metadata_cache'
      );
      return row?.count ?? 0;
    } catch {
      return 0;
    }
  },
};
