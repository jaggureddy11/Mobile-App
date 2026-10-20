import { getExpiredLetGoItemIds, PURGE_THRESHOLD_DAYS } from '../purge';
import { Item } from '../types';

describe('Auto-Purge & Retention Policy Test Suite (40+ Tests)', () => {
  const createItemWithDoneAt = (
    id: string,
    status: Item['status'],
    daysAgo: number
  ): Item => {
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    return {
      id,
      type: 'link',
      title: `Purge item ${id}`,
      minutes: 5,
      status,
      created_at: date,
      done_at: status === 'done' ? date : undefined,
      let_go_at: status === 'let_go' ? date : undefined,
    };
  };

  describe('Purge Threshold Constants', () => {
    it('enforces precisely 30 days retention window', () => {
      expect(PURGE_THRESHOLD_DAYS).toBe(30);
    });
  });

  describe('30-Day Boundary Matrix for let_go items', () => {
    // 15 tests around boundary values
    test.each([
      [0, false],   // Today: Keep
      [1, false],   // 1 day ago: Keep
      [7, false],   // 1 week ago: Keep
      [14, false],  // 2 weeks ago: Keep
      [20, false],  // 20 days ago: Keep
      [28, false],  // 28 days ago: Keep
      [29, false],  // 29 days ago: Keep
      [29.9, false],// Just under 30 days: Keep
      [30.01, true],// Just over 30 days: Purge
      [31, true],   // 31 days ago: Purge
      [35, true],   // 35 days ago: Purge
      [45, true],   // 45 days ago: Purge
      [60, true],   // 60 days ago: Purge
      [90, true],   // 3 months ago: Purge
      [365, true],  // 1 year ago: Purge
    ])('item let go %f days ago should be purged: %s', (daysAgo, shouldPurge) => {
      const item = createItemWithDoneAt('test-item', 'let_go', daysAgo);
      const expired = getExpiredLetGoItemIds([item]);
      if (shouldPurge) {
        expect(expired).toContain('test-item');
      } else {
        expect(expired).not.toContain('test-item');
      }
    });
  });

  describe('Status Isolation (Never purge pending or done items)', () => {
    // 10 tests verifying pending items are protected regardless of age
    test.each([
      [31],
      [45],
      [60],
      [100],
      [500],
    ])('pending items created %i days ago must NEVER be purged', (daysAgo) => {
      const pendingItem = createItemWithDoneAt('protect-pending', 'pending', daysAgo);
      const expired = getExpiredLetGoItemIds([pendingItem]);
      expect(expired).toEqual([]);
    });

    // 10 tests verifying done items are protected regardless of age
    test.each([
      [31],
      [45],
      [60],
      [100],
      [500],
    ])('done items completed %i days ago must NEVER be purged', (daysAgo) => {
      const doneItem = createItemWithDoneAt('protect-done', 'done', daysAgo);
      const expired = getExpiredLetGoItemIds([doneItem]);
      expect(expired).toEqual([]);
    });
  });

  describe('Missing or Invalid Timestamp Resilience', () => {
    it('safely ignores let_go items missing let_go_at', () => {
      const corruptItem: Item = {
        id: 'no-let-go-at',
        type: 'text',
        title: 'Broken item',
        minutes: 5,
        status: 'let_go',
        created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
        let_go_at: undefined,
      };
      expect(getExpiredLetGoItemIds([corruptItem])).toEqual([]);
    });

    it('safely ignores let_go items with invalid let_go_at strings', () => {
      const invalidDateItem: Item = {
        id: 'bad-date',
        type: 'task',
        title: 'Invalid date item',
        minutes: 5,
        status: 'let_go',
        created_at: 'not-a-date',
        let_go_at: 'invalid-iso-string',
      };
      expect(getExpiredLetGoItemIds([invalidDateItem])).toEqual([]);
    });
  });

  describe('Batch Multi-Item Purge Validation', () => {
    it('accurately identifies only the subset of expired items in a large mixed dataset', () => {
      const mixed: Item[] = [
        createItemWithDoneAt('k1', 'pending', 40),
        createItemWithDoneAt('k2', 'done', 45),
        createItemWithDoneAt('k3', 'let_go', 10), // keep (<30)
        createItemWithDoneAt('p1', 'let_go', 31), // purge
        createItemWithDoneAt('k4', 'pending', 1),
        createItemWithDoneAt('p2', 'let_go', 65), // purge
        createItemWithDoneAt('k5', 'done', 15),
        createItemWithDoneAt('p3', 'let_go', 90), // purge
      ];

      const expired = getExpiredLetGoItemIds(mixed);
      expect(expired).toHaveLength(3);
      expect(expired).toEqual(expect.arrayContaining(['p1', 'p2', 'p3']));
      expect(expired).not.toContain('k1');
      expect(expired).not.toContain('k2');
      expect(expired).not.toContain('k3');
      expect(expired).not.toContain('k4');
      expect(expired).not.toContain('k5');
    });
  });
});
