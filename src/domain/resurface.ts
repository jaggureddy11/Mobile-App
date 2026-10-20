import { Item, MinuteOption } from './types';
import { isItemEligible, getItemMinutes } from './eligibility';

export interface PickOptions {
  checkEligibility?: boolean;
  allowFallback?: boolean;
  now?: Date;
}

/**
 * Resurfacing algorithm:
 * Given items and the user's selected time chip (5, 15, or 30 minutes):
 * 1. Filter eligible items (pending, not snoozed, 24h waiting period if checkEligibility enabled).
 * 2. Filter items whose duration is <= selectedMinutes.
 * 3. Sort:
 *    - times_surfaced ASC (items surfaced fewer times come first)
 *    - resurfaced_at ASC (unseen items with null resurfaced_at prioritized)
 *    - created_at ASC (older items get prioritized)
 * 4. Fallback: If no candidate fits within selectedMinutes and allowFallback is enabled,
 *    return the shortest item available; otherwise return null to trigger "Nothing fits this chip" state.
 */
export function pickResurfacedItem(
  items: Item[],
  selectedMinutes: MinuteOption,
  currentExcludedId?: string | null,
  options: PickOptions = { allowFallback: true }
): Item | null {
  const now = options.now || new Date();

  // Filter pool
  const pendingItems = items.filter((item) => {
    if (options.checkEligibility) {
      if (!isItemEligible(item, now)) return false;
    } else {
      if (item.status !== 'pending') return false;
      if (item.snoozed_until && new Date(item.snoozed_until).getTime() > now.getTime()) {
        return false;
      }
    }
    return item.id !== currentExcludedId;
  });

  if (pendingItems.length === 0) {
    // If excluding currentExcludedId emptied the list, check if current item is the only pending one
    const fallback = items.filter((item) => {
      if (options.checkEligibility) return isItemEligible(item, now);
      return item.status === 'pending';
    });
    if (fallback.length === 1 && fallback[0].id === currentExcludedId) {
      return fallback[0];
    }
    return null;
  }

  // 1. Items that fit within selected time
  const fittingItems = pendingItems.filter(
    (item) => getItemMinutes(item) <= selectedMinutes
  );

  let pool: Item[] = [];
  if (fittingItems.length > 0) {
    pool = fittingItems;
  } else if (options.allowFallback) {
    // Fallback: sort all pending items by duration ascending first, then priority
    pool = [...pendingItems].sort((a, b) => getItemMinutes(a) - getItemMinutes(b));
    const shortestMinutes = getItemMinutes(pool[0]);
    pool = pool.filter((item) => getItemMinutes(item) === shortestMinutes);
  } else {
    return null;
  }

  // Sort by times_surfaced ASC, then resurfaced_at ASC (nulls first), then created_at ASC
  const sorted = [...pool].sort((a, b) => {
    const timesA = a.times_surfaced ?? 0;
    const timesB = b.times_surfaced ?? 0;
    if (timesA !== timesB) {
      return timesA - timesB;
    }

    if (!a.resurfaced_at && b.resurfaced_at) return -1;
    if (a.resurfaced_at && !b.resurfaced_at) return 1;
    if (a.resurfaced_at && b.resurfaced_at) {
      const cmp = new Date(a.resurfaced_at).getTime() - new Date(b.resurfaced_at).getTime();
      if (cmp !== 0) return cmp;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return sorted[0] || null;
}
