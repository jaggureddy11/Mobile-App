import { isItemEligible, getItemMinutes, ELIGIBILITY_WAITING_MS } from '../eligibility';
import { Item } from '../types';

describe('Domain Eligibility: 24h Waiting Rule & Fallback Defaults', () => {
  const baseItem: Item = {
    id: 'test-item-1',
    type: 'link',
    title: 'Test Link',
    url: 'https://example.com/article',
    minutes: 5,
    status: 'pending',
    created_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(), // 25 hours ago
    done_at: null,
    let_go_at: null,
    resurfaced_at: null,
    snoozed_until: null,
    times_surfaced: 0,
  };

  it('declares an item eligible when pending, unsnoozed, and saved > 24 hours ago', () => {
    expect(isItemEligible(baseItem)).toBe(true);
  });

  it('rejects done or let_go items regardless of age', () => {
    expect(isItemEligible({ ...baseItem, status: 'done' })).toBe(false);
    expect(isItemEligible({ ...baseItem, status: 'let_go' })).toBe(false);
  });

  it('rejects items saved less than 24 hours ago', () => {
    const recentItem: Item = {
      ...baseItem,
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago
    };
    expect(isItemEligible(recentItem)).toBe(false);

    const justUnder24hItem: Item = {
      ...baseItem,
      created_at: new Date(Date.now() - (ELIGIBILITY_WAITING_MS - 1000)).toISOString(),
    };
    expect(isItemEligible(justUnder24hItem)).toBe(false);
  });

  it('rejects items currently snoozed until a future timestamp', () => {
    const futureSnooze = new Date(Date.now() + 3600 * 1000).toISOString();
    const snoozedItem: Item = {
      ...baseItem,
      snoozed_until: futureSnooze,
    };
    expect(isItemEligible(snoozedItem)).toBe(false);
  });

  it('permits items whose snooze timestamp has passed', () => {
    const pastSnooze = new Date(Date.now() - 3600 * 1000).toISOString();
    const snoozedItem: Item = {
      ...baseItem,
      snoozed_until: pastSnooze,
    };
    expect(isItemEligible(snoozedItem)).toBe(true);
  });

  it('falls back to canonical defaults when minutes is undefined or out of range', () => {
    expect(getItemMinutes({ type: 'reel' })).toBe(1);
    expect(getItemMinutes({ type: 'text' })).toBe(1);
    expect(getItemMinutes({ type: 'link' })).toBe(5);
    expect(getItemMinutes({ type: 'task' })).toBe(15);
    expect(getItemMinutes({ type: 'activity' })).toBe(30);

    // Explicit valid minutes preserved
    expect(getItemMinutes({ type: 'link', minutes: 15 })).toBe(15);
    expect(getItemMinutes({ type: 'task', minutes: 30 })).toBe(30);
  });

  describe('First-Day Experience & __DEV__ Override', () => {
    const recentItem1: Item = {
      ...baseItem,
      id: 'recent-1',
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2h ago
    };
    const recentItem2: Item = {
      ...baseItem,
      id: 'recent-2',
      created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), // 5h ago
    };

    it('returns true for areAllPendingItemsYoungerThanHidePeriod when all pending items are < 24h old', () => {
      const { areAllPendingItemsYoungerThanHidePeriod } = require('../eligibility');
      expect(areAllPendingItemsYoungerThanHidePeriod([recentItem1, recentItem2])).toBe(true);
    });

    it('returns false for areAllPendingItemsYoungerThanHidePeriod when at least one item is >= 24h old', () => {
      const { areAllPendingItemsYoungerThanHidePeriod } = require('../eligibility');
      expect(areAllPendingItemsYoungerThanHidePeriod([recentItem1, baseItem])).toBe(false);
    });

    it('returns false for areAllPendingItemsYoungerThanHidePeriod when no pending items exist', () => {
      const { areAllPendingItemsYoungerThanHidePeriod } = require('../eligibility');
      expect(areAllPendingItemsYoungerThanHidePeriod([])).toBe(false);
      expect(areAllPendingItemsYoungerThanHidePeriod([{ ...recentItem1, status: 'done' }])).toBe(false);
    });

    it('allows dev override to set hide period to 0 so fresh items become eligible immediately', () => {
      const { setDevHidePeriodOverride, isItemEligible, getHidePeriodMs, HIDE_PERIOD_MS } = require('../eligibility');
      
      expect(isItemEligible(recentItem1)).toBe(false);
      expect(getHidePeriodMs()).toBe(HIDE_PERIOD_MS);

      // Set override to 0 ms
      setDevHidePeriodOverride(0);
      expect(getHidePeriodMs()).toBe(0);
      expect(isItemEligible(recentItem1)).toBe(true);

      // Reset override
      setDevHidePeriodOverride(null);
      expect(getHidePeriodMs()).toBe(HIDE_PERIOD_MS);
      expect(isItemEligible(recentItem1)).toBe(false);
    });
  });
});
