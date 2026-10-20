import { Item, ItemType, MinuteOption, DEFAULT_ITEM_MINUTES } from './types';

declare const __DEV__: boolean;

/**
 * The minimum time an item must wait in the queue before becoming eligible for resurfacing.
 * Exactly 24 hours.
 */
export const HIDE_PERIOD_HOURS = 24;
export const HIDE_PERIOD_MS = HIDE_PERIOD_HOURS * 60 * 60 * 1000;

// Aliases for backwards compatibility
export const ELIGIBILITY_WAITING_HOURS = HIDE_PERIOD_HOURS;
export const ELIGIBILITY_WAITING_MS = HIDE_PERIOD_MS;

let devHidePeriodMsOverride: number | null = null;

/**
 * __DEV__-only override allowing the 24h hide period to be set to 0 in development builds or tests.
 */
export function setDevHidePeriodOverride(ms: number | null): void {
  try {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      devHidePeriodMsOverride = ms;
    } else if (process.env.NODE_ENV !== 'production') {
      devHidePeriodMsOverride = ms;
    }
  } catch {
    devHidePeriodMsOverride = ms;
  }
}

/**
 * Returns the effective hide period duration in milliseconds.
 */
export function getHidePeriodMs(): number {
  if (devHidePeriodMsOverride !== null) {
    return devHidePeriodMsOverride;
  }
  return HIDE_PERIOD_MS;
}

/**
 * Returns the effective minutes for an item, falling back to canonical defaults:
 * reel: 1, text: 1, link: 5, task: 15, activity: 30
 */
export function getItemMinutes(item: { type: ItemType; minutes?: number | null }): MinuteOption {
  if (item.minutes === 1 || item.minutes === 5 || item.minutes === 15 || item.minutes === 30) {
    return item.minutes;
  }
  return DEFAULT_ITEM_MINUTES[item.type] ?? 15;
}

/**
 * Pure eligibility determination function.
 * An item is eligible for resurfacing IF AND ONLY IF:
 * 1. Status is waiting / pending (not done, not let_go)
 * 2. It is not currently snoozed (snoozed_until is null or past)
 * 3. It was saved at least 24 hours ago (created_at <= now - hidePeriod)
 *
 * @param item - The item to evaluate
 * @param now - Reference timestamp (defaults to current time)
 */
export function isItemEligible(item: Item, now: Date = new Date()): boolean {
  // 1. Status must be pending/waiting
  if (item.status !== 'pending') {
    return false;
  }

  const nowMs = now.getTime();

  // 2. Must not be snoozed
  if (item.snoozed_until) {
    const snoozedUntilMs = new Date(item.snoozed_until).getTime();
    if (!isNaN(snoozedUntilMs) && snoozedUntilMs > nowMs) {
      return false;
    }
  }

  // 3. Must be saved at least 24 hours ago (or hide period)
  const createdAtMs = new Date(item.created_at).getTime();
  const hidePeriodMs = getHidePeriodMs();
  if (isNaN(createdAtMs) || createdAtMs > nowMs - hidePeriodMs) {
    return false;
  }

  return true;
}

/**
 * Checks if waiting items exist, but all of them were created within the 24h hide period.
 * When true, triggers the First-Day experience on the Today tab.
 */
export function areAllPendingItemsYoungerThanHidePeriod(
  items: Item[],
  now: Date = new Date()
): boolean {
  const pendingItems = items.filter((i) => i.status === 'pending');
  if (pendingItems.length === 0) return false;

  const nowMs = now.getTime();
  const hidePeriodMs = getHidePeriodMs();

  return pendingItems.every((item) => {
    const createdAtMs = new Date(item.created_at).getTime();
    return !isNaN(createdAtMs) && createdAtMs > nowMs - hidePeriodMs;
  });
}
