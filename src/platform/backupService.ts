import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { itemsRepo } from '../db/itemsRepo';
import { collectionsRepo } from '../db/collectionsRepo';
import { settingsRepo } from '../db/settingsRepo';
import { Item, Collection, UserSettings } from '../domain/types';

export interface ReMindBackup {
  version: number;
  exported_at: string;
  app_name: string;
  data: {
    items: Item[];
    collections: Collection[];
    settings: UserSettings;
  };
}

/**
 * Exports complete app database to a JSON backup file and triggers native share sheet.
 */
export async function exportBackup(): Promise<{ success: boolean; itemCount: number }> {
  try {
    const items = await itemsRepo.getAll();
    const collections = await collectionsRepo.getAll();
    const settings = await settingsRepo.getSettings();

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
 * Imports items and collections from a Re:Mind JSON backup file.
 */
export async function importBackup(): Promise<{ success: boolean; restoredCount: number }> {
  try {
    const pickerResult = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
      return { success: false, restoredCount: 0 };
    }

    const fileUri = pickerResult.assets[0].uri;
    const fileContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const backup: ReMindBackup = JSON.parse(fileContent);

    if (!backup || !backup.data || !Array.isArray(backup.data.items)) {
      throw new Error('Invalid backup file format.');
    }

    let restoredCount = 0;
    for (const item of backup.data.items) {
      if (item.title) {
        await itemsRepo.create({
          type: item.type || 'link',
          title: item.title,
          url: item.url || null,
          note: item.note || null,
          minutes: item.minutes || 5,
          collection_id: item.collection_id || null,
          tags: item.tags || [],
          remind_interval: item.remind_interval || null,
          image_url: item.image_url || null,
          site_name: item.site_name || null,
        }).catch(() => {});
        restoredCount++;
      }
    }

    if (Array.isArray(backup.data.collections)) {
      for (const col of backup.data.collections) {
        if (col.name) {
          await collectionsRepo.create(col.name, col.color || null).catch(() => {});
        }
      }
    }

    return { success: true, restoredCount };
  } catch (err: any) {
    console.error('Backup import error:', err);
    throw err;
  }
}
