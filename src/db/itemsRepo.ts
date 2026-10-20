import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { Item, CreateItemInput, ItemStatus, DEFAULT_ITEM_MINUTES } from '../domain/types';
import { normalizeUrl } from '../domain/urlUtils';

function generateUUID(): string {
  try {
    const id = Crypto?.randomUUID?.();
    if (id) return id;
  } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function deserializeItem(row: any): Item {
  let parsedTags: string[] = [];
  if (row.tags) {
    try {
      parsedTags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    } catch {
      parsedTags = String(row.tags).split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }
  return {
    ...row,
    tags: Array.isArray(parsedTags) ? parsedTags : [],
    times_surfaced: row.times_surfaced ?? 0,
    snoozed_until: row.snoozed_until ?? null,
  };
}

function calculateRemindAt(interval?: string | null): string | null {
  if (!interval || interval === 'none') return null;
  const now = new Date();
  if (interval === 'daily' || interval === '1_day') {
    now.setDate(now.getDate() + 1);
  } else if (interval === '2_days') {
    now.setDate(now.getDate() + 2);
  } else if (interval === '1_month') {
    now.setMonth(now.getMonth() + 1);
  }
  return now.toISOString();
}

export const itemsRepo = {
  async getAll(): Promise<Item[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM items ORDER BY created_at DESC'
    );
    return rows.map(deserializeItem);
  },

  async getPending(): Promise<Item[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM items WHERE status = 'pending' ORDER BY created_at DESC"
    );
    return rows.map(deserializeItem);
  },

  async getById(id: string): Promise<Item | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM items WHERE id = ?',
      [id]
    );
    return row ? deserializeItem(row) : null;
  },

  async findByNormalizedUrl(rawUrl: string): Promise<Item | null> {
    const normalizedTarget = normalizeUrl(rawUrl);
    if (!normalizedTarget) return null;

    const db = await getDatabase();
    // Direct indexed query on normalized_url column
    const row = await db.getFirstAsync<any>(
      "SELECT * FROM items WHERE normalized_url = ? AND status = 'pending' LIMIT 1",
      [normalizedTarget]
    );
    return row ? deserializeItem(row) : null;
  },

  async getCount(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM items');
    return row?.count ?? 0;
  },

  async create(input: CreateItemInput): Promise<Item> {
    const db = await getDatabase();
    const remindAt = input.remind_at || calculateRemindAt(input.remind_interval);
    const tagsJson = JSON.stringify(input.tags || []);
    const normalizedUrl = input.url ? normalizeUrl(input.url) : null;

    const newItem: Item = {
      id: generateUUID(),
      type: input.type,
      title: input.title.trim(),
      url: input.url?.trim() || null,
      note: input.note?.trim() || null,
      minutes: input.minutes ?? DEFAULT_ITEM_MINUTES[input.type] ?? 15,
      status: 'pending',
      created_at: new Date().toISOString(),
      done_at: null,
      let_go_at: null,
      resurfaced_at: null,
      snoozed_until: input.snoozed_until || null,
      times_surfaced: input.times_surfaced || 0,
      collection_id: input.collection_id || null,
      tags: input.tags || [],
      remind_interval: input.remind_interval || 'none',
      remind_at: remindAt,
      image_url: input.image_url ?? null,
      site_name: input.site_name ?? null,
      normalized_url: normalizedUrl,
    };

    await db.runAsync(
      `INSERT INTO items (id, type, title, url, note, minutes, status, created_at, done_at, let_go_at, resurfaced_at, snoozed_until, times_surfaced, collection_id, tags, remind_interval, remind_at, image_url, site_name, normalized_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newItem.id,
        newItem.type,
        newItem.title,
        newItem.url ?? null,
        newItem.note ?? null,
        newItem.minutes,
        newItem.status,
        newItem.created_at,
        newItem.done_at ?? null,
        newItem.let_go_at ?? null,
        newItem.resurfaced_at ?? null,
        newItem.snoozed_until ?? null,
        newItem.times_surfaced ?? 0,
        newItem.collection_id ?? null,
        tagsJson,
        newItem.remind_interval ?? null,
        newItem.remind_at ?? null,
        newItem.image_url ?? null,
        newItem.site_name ?? null,
        newItem.normalized_url ?? null,
      ]
    );

    return newItem;
  },

  async updateStatus(id: string, status: ItemStatus): Promise<Item | null> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const doneAt = status === 'done' ? now : null;
    const letGoAt = status === 'let_go' ? now : null;

    await db.runAsync(
      `UPDATE items SET status = ?, done_at = ?, let_go_at = ? WHERE id = ?`,
      [status, doneAt, letGoAt, id]
    );

    return this.getById(id);
  },

  async snooze(id: string, snoozedUntilUtc: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE items SET snoozed_until = ?, resurfaced_at = ? WHERE id = ?',
      [snoozedUntilUtc, now, id]
    );
  },

  async recordSurfaceEvent(itemId: string, chipMinutes: number): Promise<string> {
    const db = await getDatabase();
    const eventId = generateUUID();
    const now = new Date().toISOString();
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO surface_events (id, item_id, shown_at, chip_minutes, action, acted_at)
           VALUES (?, ?, ?, ?, NULL, NULL)`,
          [eventId, itemId, now, chipMinutes]
        );
        await db.runAsync(
          `UPDATE items SET times_surfaced = COALESCE(times_surfaced, 0) + 1, resurfaced_at = ? WHERE id = ?`,
          [now, itemId]
        );
      });
      return eventId;
    } catch (err: any) {
      if (__DEV__) {
        console.warn('recordSurfaceEvent database error:', err?.message || err);
      }
      throw err;
    }
  },

  async recordSurfaceAction(eventId: string, action: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE surface_events SET action = ?, acted_at = ? WHERE id = ?`,
      [action, now, eventId]
    );
  },

  async markResurfaced(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE items SET resurfaced_at = ? WHERE id = ?',
      [now, id]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
  },

  async deleteMultiple(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(
      `DELETE FROM items WHERE id IN (${placeholders})`,
      ids
    );
  },

  async restore(id: string): Promise<Item | null> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE items SET status = 'pending', let_go_at = NULL, done_at = NULL WHERE id = ?",
      [id]
    );
    return this.getById(id);
  },
};
