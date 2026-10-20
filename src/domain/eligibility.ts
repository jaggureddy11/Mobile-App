import { Item, ItemType, MinuteOption, DEFAULT_ITEM_MINUTES } from './types';

/**
 * The minimum time an item must wait in the queue before becoming eligible for resurfacing.
 * Exactly 24 hours.
 */
export const ELIGIBILITY_WAITING_HOURS = 24;
export const ELIGIBILITY_WAITING_MS = ELIGIBILITY_WAITING_HOURS * 60 * 60 * 1000;

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
 * 3. It was saved at least 24 hours ago (created_at <= now - 24h)
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

  // 3. Must be saved at least 24 hours ago
  const createdAtMs = new Date(item.created_at).getTime();
  if (isNaN(createdAtMs) || createdAtMs > nowMs - ELIGIBILITY_WAITING_MS) {
    return false;
  }

  return true;
}
