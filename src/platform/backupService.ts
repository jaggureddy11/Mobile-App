import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { itemsRepo } from '../db/itemsRepo';
import { collectionsRepo } from '../db/collectionsRepo';
import { settingsRepo } from '../db/settingsRepo';
import { getDatabase } from '../db/database';
import { Item, Collection, UserSettings, ItemType } from '../domain/types';
import { normalizeUrl } from '../domain/urlUtils';
import * as Crypto from 'expo-crypto';

function generateUUID(): string {
  try {
    const id = Crypto?.randomUUID?.();
    if (id) return id;
  } catch {}
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

export const MAX_BACKUP_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
const VALID_ITEM_TYPES = new Set<ItemType>(['link', 'reel', 'text', 'task', 'activity']);
const FORBIDDEN_SECRET_KEYS = ['password', 'user_password', 'secret', 'token', 'auth_token', 'private_key'];

export interface ReMindBackup {
  version: number;
  exported_at: string;
  app_name: string;
  data: {
    items: Item[];
    collections: Collection[];
    settings?: Partial<UserSettings>;
  };
}

/**
 * Strips any potential secret or credential keys from record objects.
 */
function sanitizeRecord<T extends Record<string, any>>(record: T): T {
  const sanitized = { ...record };
  for (const key of Object.keys(sanitized)) {
    if (FORBIDDEN_SECRET_KEYS.includes(key.toLowerCase())) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

/**
 * Validates the raw parsed JSON structure and every item record shape before any DB writes.
 * Throws a descriptive Error if validation fails.
 */
export function validateBackupData(backup: any): ReMindBackup {
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
    throw new Error('Invalid backup file: content must be a JSON object.');
  }

  // (a) Validate version field
  if (typeof backup.version !== 'number' || backup.version !== 1) {
    throw new Error(`Unsupported backup version: ${backup.version ?? 'missing'}. Expected version 1.`);
  }

  if (!backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) {
    throw new Error('Invalid backup structure: "data" object is required.');
  }

  if (!Array.isArray(backup.data.items)) {
    throw new Error('Invalid backup structure: "data.items" must be an array.');
  }

  // (a) Validate shape of every item record before writing
  for (let i = 0; i < backup.data.items.length; i++) {
    const item = backup.data.items[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`Invalid item record at index ${i}: item must be an object.`);
    }

    if (typeof item.title !== 'string' || !item.title.trim()) {
      throw new Error(`Invalid item record at index ${i}: missing or empty "title".`);
    }

    if (item.type && !VALID_ITEM_TYPES.has(item.type)) {
      throw new Error(`Invalid item record at index ${i}: unrecognized type "${item.type}".`);
    }

    if (item.minutes !== undefined && item.minutes !== null) {
      if (typeof item.minutes !== 'number' || item.minutes <= 0) {
        throw new Error(`Invalid item record at index ${i}: "minutes" must be a positive number.`);
      }
    }
  }

  // Validate collections if provided
  if (backup.data.collections) {
    if (!Array.isArray(backup.data.collections)) {
      throw new Error('Invalid backup structure: "data.collections" must be an array.');
    }
    for (let i = 0; i < backup.data.collections.length; i++) {
      const col = backup.data.collections[i];
      if (!col || typeof col !== 'object' || Array.isArray(col)) {
        throw new Error(`Invalid collection record at index ${i}: collection must be an object.`);
      }
      if (typeof col.name !== 'string' || !col.name.trim()) {
        throw new Error(`Invalid collection record at index ${i}: missing or empty "name".`);
      }
    }
  }

  return backup as ReMindBackup;
}

/**
 * Parses and validates raw JSON string content, enforcing size limit and schema.
 */
export function parseAndValidateBackupString(fileContent: string): ReMindBackup {
  // (e) Reject files over size limit
  if (fileContent.length > MAX_BACKUP_SIZE_BYTES) {
    throw new Error(`Backup file exceeds maximum allowed size of ${MAX_BACKUP_SIZE_BYTES / (1024 * 1024)} MB.`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(fileContent);
  } catch (err: any) {
    throw new Error(`Failed to parse backup JSON: ${err?.message || 'Invalid JSON syntax'}`);
  }

  return validateBackupData(parsed);
}

/**
 * Restores validated backup data into SQLite inside a single atomic transaction.
 * Guarantees that:
 * - If any SQL statement or error occurs mid-import, the transaction rolls back completely,
 *   leaving all pre-existing records untouched.
 * - Normalized-URL duplicate check is run against both existing pending items and within the batch.
 * - Secret fields are explicitly filtered out.
 */
export async function restoreBackupData(
  backup: ReMindBackup
): Promise<{ success: boolean; restoredCount: number; skippedDuplicates: number }> {
  const db = await getDatabase();
  let restoredCount = 0;
  let skippedDuplicates = 0;

  // Track seen normalized URLs in the current batch to avoid importing duplicates within the file itself
  const seenBatchUrls = new Set<string>();

  // (b) Run in one transaction and leave existing data untouched on any failure
  await db.withTransactionAsync(async () => {
    // 1. Restore collections first
    if (Array.isArray(backup.data.collections)) {
      for (const col of backup.data.collections) {
        const cleanCol = sanitizeRecord(col);
        const colId = cleanCol.id || generateUUID();
        const colName = cleanCol.name.trim();
        const colColor = cleanCol.color || null;
        const createdAt = cleanCol.created_at || new Date().toISOString();

        // Insert or keep existing collection
        await db.runAsync(
          'INSERT OR IGNORE INTO collections (id, name, color, created_at) VALUES (?, ?, ?, ?)',
          [colId, colName, colColor, createdAt]
        );
      }
    }

    // 2. Restore items with normalized-URL duplicate checking
    for (const item of backup.data.items) {
      const cleanItem = sanitizeRecord(item);
      const url = cleanItem.url?.trim() || null;
      const normalizedUrl = url ? normalizeUrl(url) : null;
      const status = cleanItem.status === 'done' || cleanItem.status === 'let_go' ? cleanItem.status : 'pending';

      // (c) Canonical normalized-URL duplicate check for pending items
      if (status === 'pending' && normalizedUrl) {
        // Check if duplicate exists within the import batch
        if (seenBatchUrls.has(normalizedUrl)) {
          skippedDuplicates++;
          continue;
        }

        // Check if an existing pending item already has this normalized URL in the database
        const existing = await db.getFirstAsync<{ id: string }>(
          "SELECT id FROM items WHERE normalized_url = ? AND status = 'pending' LIMIT 1",
          [normalizedUrl]
        );

        if (existing) {
          skippedDuplicates++;
          continue;
        }

        seenBatchUrls.add(normalizedUrl);
      }

      const itemId = cleanItem.id || generateUUID();
      const itemType = cleanItem.type || 'link';
      const title = cleanItem.title.trim();
      const note = cleanItem.note?.trim() || null;
      const minutes = cleanItem.minutes || 5;
      const createdAt = cleanItem.created_at || new Date().toISOString();
      const doneAt = cleanItem.done_at || null;
      const letGoAt = cleanItem.let_go_at || null;
      const resurfacedAt = cleanItem.resurfaced_at || null;
      const snoozedUntil = cleanItem.snoozed_until || null;
      const timesSurfaced = typeof cleanItem.times_surfaced === 'number' ? cleanItem.times_surfaced : 0;
      const collectionId = cleanItem.collection_id || null;
      const tags = JSON.stringify(cleanItem.tags || []);
      const remindInterval = cleanItem.remind_interval || null;
      const remindAt = cleanItem.remind_at || null;
      const imageUrl = cleanItem.image_url || null;
      const siteName = cleanItem.site_name || null;
      const mergedInto = cleanItem.merged_into || null;

      await db.runAsync(
        `INSERT INTO items (
          id, type, title, url, note, minutes, status, created_at, done_at, let_go_at,
          resurfaced_at, snoozed_until, times_surfaced, collection_id, tags,
          remind_interval, remind_at, image_url, site_name, normalized_url, merged_into
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          itemType,
          title,
          url,
          note,
          minutes,
          status,
          createdAt,
          doneAt,
          letGoAt,
          resurfacedAt,
          snoozedUntil,
          timesSurfaced,
          collectionId,
          tags,
          remindInterval,
          remindAt,
          imageUrl,
          siteName,
          normalizedUrl,
          mergedInto,
        ]
      );

      restoredCount++;
    }
  });

  return { success: true, restoredCount, skippedDuplicates };
}

/**
 * Exports complete app database to a sanitized JSON backup file and triggers native share sheet.
 * (d) Never reads or writes a password or other secret field.
 */
export async function exportBackup(): Promise<{ success: boolean; itemCount: number }> {
  try {
    const rawItems = await itemsRepo.getAll();
    const rawCollections = await collectionsRepo.getAll();
    const rawSettings = await settingsRepo.getSettings();

    // Sanitize every record to ensure no secret field can ever be exported
    const items = rawItems.map((item) => sanitizeRecord(item as any));
    const collections = rawCollections.map((col) => sanitizeRecord(col as any));
    const settings = sanitizeRecord(rawSettings as any);

    const backup: ReMindBackup = {
      version: 1,
      exported_at: new Date().toISOString(),
      app_name: 'Re:Mind',
      data: {
        items,
        collections,
        settings,
      },
    };

    const jsonString = JSON.stringify(backup, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `remind_backup_${dateStr}.json`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Export Re:Mind Data Backup',
        UTI: 'public.json',
      });
    }

    return { success: true, itemCount: items.length };
  } catch (err: any) {
    console.error('Backup export error:', err);
    throw err;
  }
}

/**
 * Imports items and collections from a Re:Mind JSON backup file selected via native document picker.
 */
export async function importBackup(): Promise<{ success: boolean; restoredCount: number; skippedDuplicates: number }> {
  try {
    const pickerResult = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
      return { success: false, restoredCount: 0, skippedDuplicates: 0 };
    }

    const asset = pickerResult.assets[0];

    // (e) Rejects files over size limit
    if (asset.size && asset.size > MAX_BACKUP_SIZE_BYTES) {
      throw new Error(`Backup file exceeds maximum allowed size of ${MAX_BACKUP_SIZE_BYTES / (1024 * 1024)} MB.`);
    }

    const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Validates JSON syntax, version, and record shapes before any write
    const backup = parseAndValidateBackupString(fileContent);

    // Restores within an atomic transaction with duplicate checks
    return await restoreBackupData(backup);
  } catch (err: any) {
    console.error('Backup import error:', err);
    throw err;
  }
}
