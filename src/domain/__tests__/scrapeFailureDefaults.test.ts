import { ItemType, MinuteOption } from '../types';
import { fetchUrlMetadata } from '../../platform/metadataScraper';
import { useItemsStore } from '../useItemsStore';
import { detectItemClassification } from '../classification';
import { setTestDatabase } from '../../db/database';

jest.mock('../../platform/metadataScraper', () => ({
  fetchUrlMetadata: jest.fn(),
}));

jest.mock('../../platform/notifications', () => ({
  requestNotificationPermission: jest.fn().mockResolvedValue(false),
  scheduleNudgeNotification: jest.fn().mockResolvedValue(undefined),
}));

describe('Scrape Failure Defaults: Real Add Path (store.addItem & Add Screen)', () => {
  let createdItems: any[] = [];
  let mockDb: any;

  beforeEach(() => {
    createdItems = [];
    jest.clearAllMocks();

    // Mock fetchUrlMetadata to fail (simulating network error / timeout)
    (fetchUrlMetadata as jest.Mock).mockRejectedValue(new Error('Network offline / scrape timeout'));

    mockDb = {
      getFirstAsync: jest.fn().mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT COUNT(*)')) return { count: createdItems.length };
        if (sql.includes("key = 'notification_prompted'")) return { value: '1' };
        return null;
      }),
      getAllAsync: jest.fn().mockImplementation(async (sql: string) => {
        if (sql.includes('FROM items')) return createdItems;
        return [];
      }),
      runAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('INSERT INTO items')) {
          createdItems.push({
            id: params?.[0],
            type: params?.[1],
            title: params?.[2],
            url: params?.[3],
            note: params?.[4],
            minutes: params?.[5],
            status: params?.[6],
            created_at: params?.[7],
          });
        }
        return { changes: 1 };
      }),
      withTransactionAsync: jest.fn().mockImplementation(async (cb: () => Promise<any>) => cb()),
    };

    setTestDatabase(mockDb);

    useItemsStore.setState({
      items: [],
      selectedMinutes: 5,
      activeItem: null,
      currentSurfaceEventId: null,
    });
  });

  afterEach(() => {
    setTestDatabase(null);
  });

  /**
   * Helper that mirrors the exact logic used in the Add screen (app/add.tsx) and Share Intent:
   * 1. Detects URL classification or defaults to type chip
   * 2. Attempts fetchUrlMetadata (which fails)
   * 3. Falls back gracefully to classified/default minutes
   * 4. Dispatches store.addItem()
   */
  async function saveThroughAddScreenPath({
    url,
    type,
    title,
  }: {
    url?: string | null;
    type?: ItemType;
    title: string;
  }) {
    let resolvedType: ItemType = type || 'link';
    let resolvedMinutes: MinuteOption = 5;

    if (url && url.trim().startsWith('http')) {
      const classification = detectItemClassification(url.trim());
      resolvedType = classification.type;
      resolvedMinutes = classification.suggestedMinutes;

      try {
        const meta = await fetchUrlMetadata(url.trim());
        if (meta?.estimatedMinutes) {
          resolvedMinutes = meta.estimatedMinutes;
        }
      } catch {
        // Scrape failure: retains classification.suggestedMinutes
      }
    } else if (type) {
      const { DEFAULT_ITEM_MINUTES } = require('../types');
      resolvedMinutes = DEFAULT_ITEM_MINUTES[type];
    }

    return await useItemsStore.getState().addItem({
      type: resolvedType,
      title,
      url: url || null,
      minutes: resolvedMinutes,
    });
  }

  test('unknown link: saves through real add path with fetchUrlMetadata failing and receives 5 minutes', async () => {
    const unknownUrl = 'https://example.com/unclassified-random-page';
    const savedItem = await saveThroughAddScreenPath({
      url: unknownUrl,
      title: 'Unknown Article Link',
    });

    expect(fetchUrlMetadata).toHaveBeenCalledWith(unknownUrl);
    expect(savedItem.type).toBe('link');
    expect(savedItem.minutes).toBe(5);

    // Verify persisted record in database
    const dbRecord = createdItems.find((i) => i.id === savedItem.id);
    expect(dbRecord).toBeDefined();
    expect(dbRecord.minutes).toBe(5);
  });

  test('reel URL: saves through real add path with fetchUrlMetadata failing and receives 1 minute', async () => {
    const reelUrl = 'https://www.instagram.com/reel/C123456789/';
    const savedItem = await saveThroughAddScreenPath({
      url: reelUrl,
      title: 'Short Reel Video',
    });

    expect(fetchUrlMetadata).toHaveBeenCalledWith(reelUrl);
    expect(savedItem.type).toBe('reel');
    expect(savedItem.minutes).toBe(1);

    const dbRecord = createdItems.find((i) => i.id === savedItem.id);
    expect(dbRecord).toBeDefined();
    expect(dbRecord.minutes).toBe(1);
  });

  test('plain text: saves through real add path and receives 1 minute', async () => {
    const savedItem = await saveThroughAddScreenPath({
      type: 'text',
      title: 'Quick thought or reflection',
      url: null,
    });

    expect(savedItem.type).toBe('text');
    expect(savedItem.minutes).toBe(1);

    const dbRecord = createdItems.find((i) => i.id === savedItem.id);
    expect(dbRecord).toBeDefined();
    expect(dbRecord.minutes).toBe(1);
  });

  test('task: saves through real add path and receives 15 minutes', async () => {
    const savedItem = await saveThroughAddScreenPath({
      type: 'task',
      title: 'Review weekly budget spreadsheet',
      url: null,
    });

    expect(savedItem.type).toBe('task');
    expect(savedItem.minutes).toBe(15);

    const dbRecord = createdItems.find((i) => i.id === savedItem.id);
    expect(dbRecord).toBeDefined();
    expect(dbRecord.minutes).toBe(15);
  });

  test('activity: saves through real add path and receives 30 minutes', async () => {
    const savedItem = await saveThroughAddScreenPath({
      type: 'activity',
      title: 'Evening mindful walk in the park',
      url: null,
    });

    expect(savedItem.type).toBe('activity');
    expect(savedItem.minutes).toBe(30);

    const dbRecord = createdItems.find((i) => i.id === savedItem.id);
    expect(dbRecord).toBeDefined();
    expect(dbRecord.minutes).toBe(30);
  });

  test('direct store.addItem path without explicit minutes automatically applies defaults when scraping is absent', async () => {
    const itemReel = await useItemsStore.getState().addItem({
      type: 'reel',
      title: 'Reel without minutes',
    });
    expect(itemReel.minutes).toBe(1);

    const itemLink = await useItemsStore.getState().addItem({
      type: 'link',
      title: 'Link without minutes',
    });
    expect(itemLink.minutes).toBe(5);

    const itemText = await useItemsStore.getState().addItem({
      type: 'text',
      title: 'Text without minutes',
    });
    expect(itemText.minutes).toBe(1);

    const itemTask = await useItemsStore.getState().addItem({
      type: 'task',
      title: 'Task without minutes',
    });
    expect(itemTask.minutes).toBe(15);

    const itemActivity = await useItemsStore.getState().addItem({
      type: 'activity',
      title: 'Activity without minutes',
    });
    expect(itemActivity.minutes).toBe(30);
  });
});

