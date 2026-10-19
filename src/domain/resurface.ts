import { Item, MinuteOption } from './types';

/**
 * Resurfacing algorithm:
 * Given a list of pending items and the user's selected available time (5, 15, or 30 minutes),
 * pick one pending item:
 * 1. Filter items whose duration is <= selectedMinutes.
 * 2. If candidates exist:
 *    - Sort primarily by `resurfaced_at` ASC (items never resurfaced or least-recently resurfaced come first).
 *    - Secondary sort by `created_at` ASC (older items get prioritized).
 * 3. Fallback: If no candidate fits within selectedMinutes (e.g. user chose 5 min but only has 15 min tasks),
 *    return the shortest item available to ensure they still get something, or null if list is empty.
 */
export function pickResurfacedItem(
  items: Item[],
  selectedMinutes: MinuteOption,
  currentExcludedId?: string | null
): Item | null {
  const pendingItems = items.filter(
    (item) => item.status === 'pending' && item.id !== currentExcludedId
  );

  if (pendingItems.length === 0) {
    // If excluding currentExcludedId emptied the list, check if current item is the only pending one
    const fallback = items.filter((item) => item.status === 'pending');
    return fallback[0] || null;
  }

  // 1. Items that fit within selected time
  const fittingItems = pendingItems.filter((item) => item.minutes <= selectedMinutes);

  const pool = fittingItems.length > 0 ? fittingItems : pendingItems;

  // Sort by resurfaced_at ASC (nulls first), then created_at ASC
  const sorted = [...pool].sort((a, b) => {
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
