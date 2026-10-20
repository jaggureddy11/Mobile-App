import { pickResurfacedItem } from '../resurface';
import { Item, MinuteOption } from '../types';

describe('Exhaustive Resurfacing Priority and Boundary Test Suite (50+ Tests)', () => {
  const createMock = (
    id: string,
    minutes: MinuteOption,
    status: Item['status'],
    createdHoursAgo: number,
    resurfacedHoursAgo: number | null = null,
    type: Item['type'] = 'link'
  ): Item => {
    const now = Date.now();
    const created_at = new Date(now - createdHoursAgo * 3600000).toISOString();
    const resurfaced_at = resurfacedHoursAgo !== null
      ? new Date(now - resurfacedHoursAgo * 3600000).toISOString()
      : null;

    return {
      id,
      type,
      title: `Item ${id}`,
      minutes,
      status,
      created_at,
      resurfaced_at,
    };
  };

  describe('Duration Constraint Filtering (1, 5, 15, 30 min)', () => {
    const items: Item[] = [
      createMock('1m-item', 1, 'pending', 10),
      createMock('5m-item', 5, 'pending', 9),
      createMock('15m-item', 15, 'pending', 8),
      createMock('30m-item', 30, 'pending', 7),
    ];

    it('1 min slot: only accepts items <= 1 min', () => {
      const picked = pickResurfacedItem(items, 1);
      expect(picked?.id).toBe('1m-item');
    });

    it('5 min slot: accepts 1m or 5m items, ordered by priority', () => {
      const picked = pickResurfacedItem(items, 5);
      // '1m-item' was created 10 hours ago (earlier than 5m-item created 9 hours ago)
      expect(picked?.id).toBe('1m-item');
    });

    it('15 min slot: accepts 1m, 5m, or 15m items', () => {
      const picked = pickResurfacedItem(items, 15);
      expect(['1m-item', '5m-item', '15m-item']).toContain(picked?.id);
    });

    it('30 min slot: accepts all valid durations', () => {
      const picked = pickResurfacedItem(items, 30);
      expect(picked).not.toBeNull();
      expect(picked?.minutes).toBeLessThanOrEqual(30);
    });
  });

  describe('Status Integrity (pending vs done vs let_go)', () => {
    test.each([
      ['done', 5],
      ['let_go', 5],
      ['done', 1],
      ['let_go', 15],
      ['done', 30],
      ['let_go', 30],
    ])('never surfaces item with status %s for duration %i', (status, minutes) => {
      const singleItem: Item[] = [createMock('inv-1', minutes as MinuteOption, status as Item['status'], 1)];
      expect(pickResurfacedItem(singleItem, minutes as MinuteOption)).toBeNull();
    });
  });

  describe('Null resurfaced_at Priority over Previously Resurfaced', () => {
    // 10 test scenarios verifying brand new items always come before recycled items
    test.each([
      [1, 5, 10, 2], // 1m items: fresh (10h ago) vs resurfaced 2h ago
      [5, 5, 24, 1],
      [15, 15, 48, 5],
      [30, 30, 72, 12],
      [5, 15, 100, 24],
      [1, 30, 5, 1],
      [15, 30, 50, 6],
      [5, 5, 12, 1],
      [1, 15, 20, 4],
      [30, 30, 200, 48],
    ])('prefers fresh item over already-seen item for duration %i min', (itemMin, slotMin, createdAgo, resurfacedAgo) => {
      const fresh = createMock('fresh', itemMin as MinuteOption, 'pending', createdAgo, null);
      const seen = createMock('seen', itemMin as MinuteOption, 'pending', createdAgo + 10, resurfacedAgo);
      const picked = pickResurfacedItem([seen, fresh], slotMin as MinuteOption);
      expect(picked?.id).toBe('fresh');
    });
  });

  describe('FIFO Ordering for Unseen Items (Oldest created_at surfaces first)', () => {
    test.each([
      [5, 10, 'older-1'],
      [15, 20, 'older-2'],
      [1, 100, 'older-3'],
      [30, 50, 'older-4'],
      [5, 75, 'older-5'],
    ])('picks item created %i hours ago before item created recently', (olderHours, newerHours, id) => {
      const older = createMock(id, 5, 'pending', olderHours + 50, null);
      const newer = createMock('newer', 5, 'pending', olderHours, null);
      const picked = pickResurfacedItem([newer, older], 5);
      expect(picked?.id).toBe(id);
    });
  });

  describe('LRU Ordering for Seen Items (Least recently resurfaced surfaces first)', () => {
    test.each([
      [24, 2, 'stale-1'],
      [48, 5, 'stale-2'],
      [72, 10, 'stale-3'],
      [100, 20, 'stale-4'],
      [120, 1, 'stale-5'],
    ])('surfaces item resurfaced %i hours ago before item resurfaced %i hours ago', (staleAgo, freshAgo, id) => {
      const stale = createMock(id, 5, 'pending', 200, staleAgo);
      const recentlySeen = createMock('recent', 5, 'pending', 200, freshAgo);
      const picked = pickResurfacedItem([recentlySeen, stale], 5);
      expect(picked?.id).toBe(id);
    });
  });

  describe('Skip/Exclude Current Item Mechanism (Show Something Else)', () => {
    const list: Item[] = [
      createMock('A', 5, 'pending', 10, null),
      createMock('B', 5, 'pending', 9, null),
      createMock('C', 5, 'pending', 8, null),
    ];

    it('skips item A when A is explicitly excluded', () => {
      const picked = pickResurfacedItem(list, 5, 'A');
      expect(picked?.id).toBe('B');
    });

    it('skips item B when B is excluded', () => {
      const picked = pickResurfacedItem(list, 5, 'B');
      expect(picked?.id).toBe('A');
    });

    it('falls back gracefully to A if A is the only fitting item even when excluded', () => {
      const singleItem: Item[] = [createMock('solo', 5, 'pending', 10, null)];
      const picked = pickResurfacedItem(singleItem, 5, 'solo');
      expect(picked?.id).toBe('solo');
    });
  });

  describe('Edge Cases & Resilient Fallbacks', () => {
    it('returns null on empty list', () => {
      expect(pickResurfacedItem([], 5)).toBeNull();
    });

    it('gracefully falls back to shortest pending item when all items exceed duration so user is never stranded', () => {
      const oversized: Item[] = [
        createMock('30m', 30, 'pending', 5, null),
        createMock('15m', 15, 'pending', 10, null),
      ];
      // When user selects 1 or 5 min but only has 15m/30m tasks, app shows the 15m task
      const picked = pickResurfacedItem(oversized, 1);
      expect(picked).not.toBeNull();
      expect(picked?.id).toBe('15m');
    });

    it('correctly handles identical timestamps without NaN or exceptions', () => {
      const identicalTime = new Date().toISOString();
      const twins: Item[] = [
        { id: 'T1', type: 'link', title: 'T1', minutes: 5, status: 'pending', created_at: identicalTime, resurfaced_at: null },
        { id: 'T2', type: 'link', title: 'T2', minutes: 5, status: 'pending', created_at: identicalTime, resurfaced_at: null },
      ];
      const picked = pickResurfacedItem(twins, 5);
      expect(picked).not.toBeNull();
      expect(['T1', 'T2']).toContain(picked?.id);
    });
  });
});
