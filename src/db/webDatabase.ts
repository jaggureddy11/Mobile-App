/**
 * Web Database implementation for Re:Mind
 * Provides an in-browser, persistent (localStorage-backed) SQLiteDatabase-compatible
 * adapter for React Native Web when running in Chrome / browsers.
 */

interface WebSettingsRow {
  key: string;
  value: string;
}

const STORAGE_PREFIX = 'remind_app_';

function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(STORAGE_PREFIX + key);
    }
  } catch {}
  return null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_PREFIX + key, value);
    }
  } catch {}
}

class WebSQLiteDatabase {
  private settings: Map<string, string> = new Map();
  private items: any[] = [];
  private collections: any[] = [];
  private surfaceEvents: any[] = [];
  private metadataCache: Map<string, any> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const rawSettings = getStorageItem('settings');
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.key) this.settings.set(item.key, String(item.value));
          }
        }
      }
    } catch (e) {
      if (__DEV__) console.warn('[WebDatabase] Error loading settings:', e);
    }

    try {
      const rawItems = getStorageItem('items');
      if (rawItems) {
        this.items = JSON.parse(rawItems) || [];
      }
    } catch (e) {
      if (__DEV__) console.warn('[WebDatabase] Error loading items:', e);
    }

    try {
      const rawCollections = getStorageItem('collections');
      if (rawCollections) {
        this.collections = JSON.parse(rawCollections) || [];
      }
    } catch (e) {
      if (__DEV__) console.warn('[WebDatabase] Error loading collections:', e);
    }

    try {
      const rawEvents = getStorageItem('surface_events');
      if (rawEvents) {
        this.surfaceEvents = JSON.parse(rawEvents) || [];
      }
    } catch (e) {
      if (__DEV__) console.warn('[WebDatabase] Error loading surface events:', e);
    }

    try {
      const rawCache = getStorageItem('metadata_cache');
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        if (Array.isArray(parsed)) {
          for (const entry of parsed) {
            if (entry && entry.url) this.metadataCache.set(entry.url, entry);
          }
        }
      }
    } catch (e) {
      if (__DEV__) console.warn('[WebDatabase] Error loading metadata cache:', e);
    }
  }

  private saveSettingsToStorage() {
    try {
      const array = Array.from(this.settings.entries()).map(([key, value]) => ({ key, value }));
      setStorageItem('settings', JSON.stringify(array));
    } catch {}
  }

  private saveItemsToStorage() {
    try {
      setStorageItem('items', JSON.stringify(this.items));
    } catch {}
  }

  private saveCollectionsToStorage() {
    try {
      setStorageItem('collections', JSON.stringify(this.collections));
    } catch {}
  }

  private saveSurfaceEventsToStorage() {
    try {
      setStorageItem('surface_events', JSON.stringify(this.surfaceEvents));
    } catch {}
  }

  private saveMetadataCacheToStorage() {
    try {
      const array = Array.from(this.metadataCache.values());
      setStorageItem('metadata_cache', JSON.stringify(array));
    } catch {}
  }

  async execAsync(sql: string): Promise<void> {
    // Schema creation, indexes, pragmas, drop statements are no-ops on web
    return Promise.resolve();
  }

  async runAsync(sql: string, params: any[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    // 1. SETTINGS
    if (upper.includes('INSERT OR REPLACE INTO SETTINGS') || upper.includes('INSERT INTO SETTINGS')) {
      const [key, value] = params;
      if (key !== undefined) {
        this.settings.set(String(key), String(value ?? ''));
        this.saveSettingsToStorage();
      }
      return { lastInsertRowId: 1, changes: 1 };
    }

    if (upper.startsWith('DELETE FROM SETTINGS')) {
      if (upper.includes("KEY = 'USER_PASSWORD'")) {
        this.settings.delete('user_password');
        this.saveSettingsToStorage();
      } else if (params[0]) {
        this.settings.delete(String(params[0]));
        this.saveSettingsToStorage();
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    // 2. ITEMS - INSERT
    if (upper.startsWith('INSERT INTO ITEMS')) {
      const colMatch = trimmed.match(/INSERT INTO items\s*\(([^)]+)\)/i);
      if (colMatch && colMatch[1]) {
        const columns = colMatch[1].split(',').map((c) => c.trim());
        const newItem: any = {};
        columns.forEach((col, idx) => {
          newItem[col] = params[idx] ?? null;
        });
        // Remove existing item with same id if any
        this.items = this.items.filter((i) => i.id !== newItem.id);
        this.items.push(newItem);
        this.saveItemsToStorage();
      }
      return { lastInsertRowId: 1, changes: 1 };
    }

    // 2. ITEMS - UPDATE
    if (upper.startsWith('UPDATE ITEMS SET')) {
      if (upper.includes('STATUS = ?, DONE_AT = ?, LET_GO_AT = ? WHERE ID = ?')) {
        const [status, doneAt, letGoAt, id] = params;
        const item = this.items.find((i) => i.id === id);
        if (item) {
          item.status = status;
          item.done_at = doneAt;
          item.let_go_at = letGoAt;
          this.saveItemsToStorage();
        }
      } else if (upper.includes('SNOOZED_UNTIL = ?, RESURFACED_AT = ? WHERE ID = ?')) {
        const [snoozedUntil, resurfacedAt, id] = params;
        const item = this.items.find((i) => i.id === id);
        if (item) {
          item.snoozed_until = snoozedUntil;
          item.resurfaced_at = resurfacedAt;
          this.saveItemsToStorage();
        }
      } else if (upper.includes('TIMES_SURFACED = COALESCE(TIMES_SURFACED, 0) + 1')) {
        const [resurfacedAt, id] = params;
        const item = this.items.find((i) => i.id === id);
        if (item) {
          item.times_surfaced = (item.times_surfaced || 0) + 1;
          item.resurfaced_at = resurfacedAt;
          this.saveItemsToStorage();
        }
      } else if (upper.includes('RESURFACED_AT = ? WHERE ID = ?')) {
        const [resurfacedAt, id] = params;
        const item = this.items.find((i) => i.id === id);
        if (item) {
          item.resurfaced_at = resurfacedAt;
          this.saveItemsToStorage();
        }
      } else if (upper.includes("STATUS = 'PENDING', LET_GO_AT = NULL, DONE_AT = NULL WHERE ID = ?")) {
        const [id] = params;
        const item = this.items.find((i) => i.id === id);
        if (item) {
          item.status = 'pending';
          item.let_go_at = null;
          item.done_at = null;
          this.saveItemsToStorage();
        }
      } else if (upper.includes('COLLECTION_ID = NULL WHERE COLLECTION_ID = ?')) {
        const [colId] = params;
        this.items.forEach((i) => {
          if (i.collection_id === colId) i.collection_id = null;
        });
        this.saveItemsToStorage();
      } else if (upper.includes('NORMALIZED_URL = ? WHERE ID = ?')) {
        const [normUrl, id] = params;
        const item = this.items.find((i) => i.id === id);
        if (item) {
          item.normalized_url = normUrl;
          this.saveItemsToStorage();
        }
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    // 2. ITEMS - DELETE
    if (upper.startsWith('DELETE FROM ITEMS WHERE ID = ?')) {
      const [id] = params;
      this.items = this.items.filter((i) => i.id !== id);
      this.saveItemsToStorage();
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (upper.startsWith('DELETE FROM ITEMS WHERE ID IN')) {
      const idsToDelete = new Set(params);
      this.items = this.items.filter((i) => !idsToDelete.has(i.id));
      this.saveItemsToStorage();
      return { lastInsertRowId: 0, changes: params.length };
    }

    // 3. COLLECTIONS - INSERT
    if (upper.startsWith('INSERT INTO COLLECTIONS')) {
      const [id, name, color, createdAt] = params;
      this.collections = this.collections.filter((c) => c.id !== id);
      this.collections.push({
        id,
        name,
        color: color ?? null,
        created_at: createdAt,
      });
      this.saveCollectionsToStorage();
      return { lastInsertRowId: 1, changes: 1 };
    }

    // 3. COLLECTIONS - DELETE
    if (upper.startsWith('DELETE FROM COLLECTIONS WHERE ID = ?')) {
      const [id] = params;
      this.collections = this.collections.filter((c) => c.id !== id);
      this.saveCollectionsToStorage();
      return { lastInsertRowId: 0, changes: 1 };
    }

    // 4. SURFACE EVENTS - INSERT
    if (upper.startsWith('INSERT INTO SURFACE_EVENTS')) {
      const [id, itemId, shownAt, chipMinutes] = params;
      this.surfaceEvents.push({
        id,
        item_id: itemId,
        shown_at: shownAt,
        chip_minutes: chipMinutes,
        action: null,
        acted_at: null,
      });
      this.saveSurfaceEventsToStorage();
      return { lastInsertRowId: 1, changes: 1 };
    }

    // 4. SURFACE EVENTS - UPDATE
    if (upper.startsWith('UPDATE SURFACE_EVENTS SET ACTION = ?, ACTED_AT = ? WHERE ID = ?')) {
      const [action, actedAt, id] = params;
      const ev = this.surfaceEvents.find((e) => e.id === id);
      if (ev) {
        ev.action = action;
        ev.acted_at = actedAt;
        this.saveSurfaceEventsToStorage();
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    // 5. METADATA CACHE - INSERT OR REPLACE
    if (upper.includes('INTO METADATA_CACHE')) {
      const [url, title, description, imageUrl, siteName, estimatedMinutes, cachedAt] = params;
      if (url) {
        this.metadataCache.set(String(url), {
          url: String(url),
          title: title ?? null,
          description: description ?? null,
          image_url: imageUrl ?? null,
          site_name: siteName ?? null,
          estimated_minutes: estimatedMinutes ?? null,
          cached_at: cachedAt || new Date().toISOString(),
        });
        this.saveMetadataCacheToStorage();
      }
      return { lastInsertRowId: 1, changes: 1 };
    }

    // 5. METADATA CACHE - DELETE
    if (upper.includes('DELETE FROM METADATA_CACHE')) {
      if (upper.includes('WHERE URL = ?')) {
        const [url] = params;
        const deleted = this.metadataCache.delete(String(url));
        if (deleted) this.saveMetadataCacheToStorage();
        return { lastInsertRowId: 0, changes: deleted ? 1 : 0 };
      } else if (upper.includes('WHERE CACHED_AT < ?')) {
        const [cutoff] = params;
        let count = 0;
        for (const [url, entry] of this.metadataCache.entries()) {
          if (entry.cached_at < cutoff) {
            this.metadataCache.delete(url);
            count++;
          }
        }
        if (count > 0) this.saveMetadataCacheToStorage();
        return { lastInsertRowId: 0, changes: count };
      } else if (upper.includes('WHERE URL NOT IN')) {
        const entries = Array.from(this.metadataCache.values());
        entries.sort((a, b) => (a.cached_at < b.cached_at ? 1 : -1));
        const toKeep = new Set(entries.slice(0, 500).map((e) => e.url));
        let pruned = 0;
        for (const url of this.metadataCache.keys()) {
          if (!toKeep.has(url)) {
            this.metadataCache.delete(url);
            pruned++;
          }
        }
        if (pruned > 0) this.saveMetadataCacheToStorage();
        return { lastInsertRowId: 0, changes: pruned };
      } else {
        const count = this.metadataCache.size;
        this.metadataCache.clear();
        this.saveMetadataCacheToStorage();
        return { lastInsertRowId: 0, changes: count };
      }
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  async getAllAsync<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    // 1. PRAGMA table_info
    if (upper.includes('PRAGMA TABLE_INFO(SETTINGS)')) {
      return [{ name: 'key' }, { name: 'value' }] as any;
    }
    if (upper.includes('PRAGMA TABLE_INFO(ITEMS)')) {
      return [
        { name: 'id' },
        { name: 'type' },
        { name: 'title' },
        { name: 'url' },
        { name: 'note' },
        { name: 'minutes' },
        { name: 'status' },
        { name: 'created_at' },
        { name: 'done_at' },
        { name: 'let_go_at' },
        { name: 'resurfaced_at' },
        { name: 'snoozed_until' },
        { name: 'times_surfaced' },
        { name: 'collection_id' },
        { name: 'tags' },
        { name: 'remind_interval' },
        { name: 'remind_at' },
        { name: 'image_url' },
        { name: 'site_name' },
        { name: 'normalized_url' },
        { name: 'merged_into' },
      ] as any;
    }

    // 2. SETTINGS
    if (upper.startsWith('SELECT KEY, VALUE FROM SETTINGS')) {
      const results: WebSettingsRow[] = [];
      for (const [key, value] of this.settings.entries()) {
        if (key !== 'user_password') {
          results.push({ key, value });
        }
      }
      return results as any;
    }

    // 3. COLLECTIONS with count
    if (upper.includes('FROM COLLECTIONS C') && upper.includes('COUNT(I.ID) AS ITEM_COUNT')) {
      const results = this.collections.map((col) => {
        const count = this.items.filter(
          (item) => item.collection_id === col.id && item.status !== 'let_go'
        ).length;
        return {
          ...col,
          item_count: count,
        };
      });
      if (upper.includes('WHERE C.ID = ?')) {
        const targetId = params[0];
        return results.filter((c) => c.id === targetId) as any;
      }
      // Sort by created_at asc
      results.sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
      return results as any;
    }

    // 4. ITEMS - Pending
    if (upper.includes("FROM ITEMS WHERE STATUS = 'PENDING'")) {
      const pending = this.items.filter((i) => i.status === 'pending');
      pending.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return pending as any;
    }

    // 4. ITEMS - Search
    if (upper.includes('WHERE TITLE LIKE ? OR NOTE LIKE ?')) {
      const queryStr = (params[0] || '').replace(/%/g, '').toLowerCase();
      const matched = this.items.filter((item) => {
        const titleMatch = (item.title || '').toLowerCase().includes(queryStr);
        const noteMatch = (item.note || '').toLowerCase().includes(queryStr);
        const urlMatch = (item.url || '').toLowerCase().includes(queryStr);
        const tagsMatch = (item.tags || '').toLowerCase().includes(queryStr);
        const siteMatch = (item.site_name || '').toLowerCase().includes(queryStr);
        return titleMatch || noteMatch || urlMatch || tagsMatch || siteMatch;
      });
      matched.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return matched as any;
    }

    // 4. ITEMS - General select
    if (upper.includes('FROM ITEMS') && !upper.includes('GROUP_CONCAT')) {
      const copy = [...this.items];
      copy.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return copy as any;
    }

    // 5. METADATA CACHE
    if (upper.includes('FROM METADATA_CACHE')) {
      const entries = Array.from(this.metadataCache.values());
      entries.sort((a, b) => (a.cached_at < b.cached_at ? 1 : -1));
      return entries as any;
    }

    // Default empty array
    return [];
  }

  async getFirstAsync<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    // 1. Password check in settings
    if (upper.includes("WHERE KEY = 'USER_PASSWORD'")) {
      const val = this.settings.get('user_password');
      if (upper.includes('COUNT(*) AS COUNT')) {
        return { count: val ? 1 : 0 } as any;
      }
      return val ? ({ value: val } as any) : null;
    }

    // 2. Settings by key
    if (upper.includes('FROM SETTINGS WHERE KEY = ?')) {
      const key = params[0];
      const val = this.settings.get(String(key));
      return val ? ({ value: val } as any) : null;
    }

    // 3. Items count
    if (upper.includes('SELECT COUNT(*) AS COUNT FROM ITEMS')) {
      return { count: this.items.length } as any;
    }

    // 4. Item by ID
    if (upper.includes('SELECT * FROM ITEMS WHERE ID = ?')) {
      const id = params[0];
      const item = this.items.find((i) => i.id === id);
      return (item || null) as any;
    }

    // 5. Item by normalized URL
    if (upper.includes('WHERE NORMALIZED_URL = ?')) {
      const url = params[0];
      const item = this.items.find(
        (i) => i.normalized_url === url && i.status === 'pending'
      );
      return (item || null) as any;
    }

    // 6. Metadata cache by URL
    if (upper.includes('FROM METADATA_CACHE WHERE URL = ?')) {
      const url = params[0];
      const entry = this.metadataCache.get(String(url));
      return (entry || null) as any;
    }

    // 7. Metadata cache count
    if (upper.includes('SELECT COUNT(*) AS COUNT FROM METADATA_CACHE')) {
      return { count: this.metadataCache.size } as any;
    }

    // Fallback: use getAllAsync
    const all = await this.getAllAsync<T>(sql, params);
    return all.length > 0 ? all[0] : null;
  }

  async withTransactionAsync<T>(action: () => Promise<T>): Promise<T> {
    return await action();
  }

  async withExclusiveTransactionAsync<T>(action: (txn: any) => Promise<T>): Promise<T> {
    return await action(this);
  }
}

let webDbInstance: WebSQLiteDatabase | null = null;

export function getWebDatabase(): any {
  if (!webDbInstance) {
    webDbInstance = new WebSQLiteDatabase();
  }
  return webDbInstance;
}
