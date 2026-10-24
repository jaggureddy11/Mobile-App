import { DEFAULT_ITEM_MINUTES, ItemType, MinuteOption } from '../types';
import { fetchUrlMetadata } from '../../platform/metadataScraper';
import { itemsRepo } from '../../db/itemsRepo';
import { setTestDatabase } from '../../db/database';

describe('Scrape Failure & Timeout Defaults', () => {
  let createdItems: any[] = [];
  let mockDb: any;

  beforeEach(() => {
    createdItems = [];
    mockDb = {
      getFirstAsync: jest.fn().mockResolvedValue(null),
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('INSERT INTO items')) {
          createdItems.push({
            id: params?.[0],
            type: params?.[1],
            title: params?.[2],
            url: params?.[3],
            minutes: params?.[5],
          });
        }
        return { changes: 1 };
      }),
      withTransactionAsync: jest.fn().mockImplementation(async (cb: () => Promise<any>) => cb()),
    };
    setTestDatabase(mockDb);
  });

  test('DEFAULT_ITEM_MINUTES defines the exact required defaults for all types', () => {
    expect(DEFAULT_ITEM_MINUTES.reel).toBe(1);
    expect(DEFAULT_ITEM_MINUTES.link).toBe(5);
    expect(DEFAULT_ITEM_MINUTES.text).toBe(1);
    expect(DEFAULT_ITEM_MINUTES.task).toBe(15);
    expect(DEFAULT_ITEM_MINUTES.activity).toBe(30);
  });

  test('fetchUrlMetadata returns null when fetch fails or times out', async () => {
    // Mock global fetch to reject with a Network / Timeout Error
    const originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network timeout / offline')) as any;

    try {
      const meta = await fetchUrlMetadata('https://example.com/unreachable');
      expect(meta).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('items created when metadata scraping fails or returns null receive the original defaults', async () => {
    const types: ItemType[] = ['reel', 'link', 'text', 'task', 'activity'];
    const expectedMinutes: Record<ItemType, MinuteOption> = {
      reel: 1,
      link: 5,
      text: 1,
      task: 15,
      activity: 30,
    };

    for (const type of types) {
      await itemsRepo.create({
        type,
        title: `Test ${type} item`,
        url: type === 'link' || type === 'reel' ? `https://example.com/${type}` : null,
        // minutes is omitted, simulating absence of metadata scrape duration
      });
    }

    expect(createdItems).toHaveLength(5);
    for (const item of createdItems) {
      const type = item.type as ItemType;
      expect(item.minutes).toBe(expectedMinutes[type]);
    }
  });
});
