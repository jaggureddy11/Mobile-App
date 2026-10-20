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
});
