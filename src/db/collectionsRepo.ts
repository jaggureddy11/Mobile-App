import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { Collection } from '../domain/types';

export const collectionsRepo = {
  async getAll(): Promise<Collection[]> {
    const db = await getDatabase();
    
    // Fetch collections and count of items in each collection
    const query = `
      SELECT c.*, COUNT(i.id) AS item_count
      FROM collections c
      LEFT JOIN items i ON i.collection_id = c.id AND i.status != 'let_go'
      GROUP BY c.id
      ORDER BY c.created_at ASC
    `;
    const rows = await db.getAllAsync<Collection>(query);
    
    if (rows.length === 0) {
      return this.seedDefaultsIfEmpty();
    }
    
    return rows;
  },

  async getById(id: string): Promise<Collection | null> {
    const db = await getDatabase();
    const query = `
      SELECT c.*, COUNT(i.id) AS item_count
      FROM collections c
      LEFT JOIN items i ON i.collection_id = c.id AND i.status != 'let_go'
      WHERE c.id = ?
      GROUP BY c.id
    `;
    const row = await db.getFirstAsync<Collection>(query, [id]);
    return row || null;
  },

  async create(name: string, color?: string | null): Promise<Collection> {
    const db = await getDatabase();
    const newCollection: Collection = {
      id: Crypto.randomUUID(),
      name: name.trim(),
      color: color || '#8A7E72',
      created_at: new Date().toISOString(),
      item_count: 0,
    };

    await db.runAsync(
      'INSERT INTO collections (id, name, color, created_at) VALUES (?, ?, ?, ?)',
      [newCollection.id, newCollection.name, newCollection.color ?? null, newCollection.created_at]
    );

    return newCollection;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    // Unlink items from this collection without deleting them
    await db.runAsync('UPDATE items SET collection_id = NULL WHERE collection_id = ?', [id]);
    await db.runAsync('DELETE FROM collections WHERE id = ?', [id]);
  },

  async seedDefaultsIfEmpty(): Promise<Collection[]> {
    const db = await getDatabase();
    const defaults = [
      { name: 'Articles & Focus', color: '#D4C4B0' },
      { name: 'Inspiration', color: '#8A7E72' },
      { name: 'Quick Reads', color: '#2C2825' },
    ];

    const collections: Collection[] = [];
    const now = new Date().toISOString();

    for (const item of defaults) {
      const col: Collection = {
        id: Crypto.randomUUID(),
        name: item.name,
        color: item.color,
        created_at: now,
        item_count: 0,
      };
      await db.runAsync(
        'INSERT INTO collections (id, name, color, created_at) VALUES (?, ?, ?, ?)',
        [col.id, col.name, col.color ?? null, col.created_at]
      );
      collections.push(col);
    }

    return collections;
  },
};
