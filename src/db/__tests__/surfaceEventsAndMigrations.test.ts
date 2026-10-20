jest.unmock('../itemsRepo');
import { itemsRepo } from '../itemsRepo';
import { setTestDatabase } from '../database';

describe('Surface Events, Snooze & URL Normalization DB Operations', () => {
  let mockDb: any;
  let itemsTable: any[];
  let surfaceEventsTable: any[];

  beforeEach(() => {
    itemsTable = [
      {
        id: 'item-1',
        type: 'link',
        title: 'Original Saved Article',
        url: 'https://example.com/blog/article?utm_source=twitter&utm_medium=social',
        normalized_url: 'https://example.com/blog/article',
        minutes: 5,
        status: 'pending',
        created_at: '2026-10-01T10:00:00Z',
        times_surfaced: 0,
        snoozed_until: null,
      },
    ];

    surfaceEventsTable = [];

    mockDb = {
      getAllAsync: jest.fn().mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT * FROM items')) {
          return itemsTable;
        }
        if (sql.includes('SELECT * FROM surface_events')) {
          return surfaceEventsTable;
        }
        return [];
      }),
      getFirstAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('SELECT * FROM items WHERE id = ?')) {
          return itemsTable.find((i) => i.id === params?.[0]) || null;
        }
        if (sql.includes('WHERE normalized_url = ?')) {
          return itemsTable.find((i) => i.normalized_url === params?.[0] && i.status === 'pending') || null;
        }
        if (sql.includes('SELECT COUNT(*) as count FROM items')) {
          return { count: itemsTable.length };
        }
        return null;
      }),
      runAsync: jest.fn().mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('INSERT INTO surface_events')) {
          surfaceEventsTable.push({
            id: params?.[0],
            item_id: params?.[1],
            shown_at: params?.[2],
            chip_minutes: params?.[3],
            action: null,
            acted_at: null,
          });
        }
        if (sql.includes('UPDATE items SET times_surfaced = COALESCE(times_surfaced, 0) + 1')) {
          const item = itemsTable.find((i) => i.id === params?.[1]);
          if (item) {
            item.times_surfaced = (item.times_surfaced || 0) + 1;
            item.resurfaced_at = params?.[0];
          }
        }
        if (sql.includes('UPDATE surface_events SET action = ?, acted_at = ?')) {
          const event = surfaceEventsTable.find((e) => e.id === params?.[2]);
          if (event) {
            event.action = params?.[0];
            event.acted_at = params?.[1];
          }
        }
        if (sql.includes('UPDATE items SET snoozed_until = ?, resurfaced_at = ?')) {
          const item = itemsTable.find((i) => i.id === params?.[2]);
          if (item) {
            item.snoozed_until = params?.[0];
            item.resurfaced_at = params?.[1];
          }
        }
        return undefined;
      }),
      withTransactionAsync: jest.fn().mockImplementation(async (cb: () => Promise<any>) => {
        return await cb();
      }),
    };

    setTestDatabase(mockDb);
  });

  it('records surface events and increments times_surfaced', async () => {
    const eventId = await itemsRepo.recordSurfaceEvent('item-1', 15);
    expect(eventId).toBeDefined();
    expect(surfaceEventsTable.length).toBe(1);
    expect(surfaceEventsTable[0].item_id).toBe('item-1');
    expect(surfaceEventsTable[0].chip_minutes).toBe(15);
    expect(itemsTable[0].times_surfaced).toBe(1);
  });

  it('records action taken on a surface event', async () => {
    const eventId = await itemsRepo.recordSurfaceEvent('item-1', 15);
    await itemsRepo.recordSurfaceAction(eventId, 'snooze');

    expect(surfaceEventsTable[0].action).toBe('snooze');
    expect(surfaceEventsTable[0].acted_at).toBeDefined();
  });

  it('snoozes an item with UTC timestamp', async () => {
    const snoozeUtc = '2026-10-22T19:00:00.000Z';
    await itemsRepo.snooze('item-1', snoozeUtc);

    expect(itemsTable[0].snoozed_until).toBe(snoozeUtc);
    expect(itemsTable[0].resurfaced_at).toBeDefined();
  });

  it('finds existing item by normalized URL even with tracking parameters or www differences', async () => {
    // Exact match
    const foundDirect = await itemsRepo.findByNormalizedUrl(
      'https://example.com/blog/article?utm_source=twitter&utm_medium=social'
    );
    expect(foundDirect?.id).toBe('item-1');

    // Stripped tracking params match
    const foundClean = await itemsRepo.findByNormalizedUrl('https://example.com/blog/article');
    expect(foundClean?.id).toBe('item-1');

    // With fbclid, trailing slash, and www
    const foundDirty = await itemsRepo.findByNormalizedUrl(
      'https://www.example.com/blog/article/?fbclid=IwAR2xyz'
    );
    expect(foundDirty?.id).toBe('item-1');

    // Unrelated URL returns null
    const notFound = await itemsRepo.findByNormalizedUrl('https://other.com/post');
    expect(notFound).toBeNull();
  });
});
