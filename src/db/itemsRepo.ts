import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { Item, CreateItemInput, ItemStatus, DEFAULT_ITEM_MINUTES } from '../domain/types';

export const itemsRepo = {
  async getAll(): Promise<Item[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Item>(
      'SELECT * FROM items ORDER BY created_at DESC'
    );
    return rows;
  },

  async getPending(): Promise<Item[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Item>(
      "SELECT * FROM items WHERE status = 'pending' ORDER BY created_at DESC"
    );
    return rows;
  },

  async getById(id: string): Promise<Item | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Item>(
      'SELECT * FROM items WHERE id = ?',
      [id]
    );
    return row || null;
  },

  async create(input: CreateItemInput): Promise<Item> {
    const db = await getDatabase();
    const newItem: Item = {
      id: Crypto.randomUUID(),
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
    };

    await db.runAsync(
      `INSERT INTO items (id, type, title, url, note, minutes, status, created_at, done_at, let_go_at, resurfaced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
