import { Item } from './types';

export const PURGE_THRESHOLD_DAYS = 30;
export const THIRTY_DAYS_MS = PURGE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

/**
 * Filter out items that should be purged permanently:
 * - Status is 'let_go'
 * - `let_go_at` is older than 30 days compared to `now`
 * 
 * Returns the IDs of the items to be purged.
 */
export function getExpiredLetGoItemIds(
  items: Item[],
  now: Date = new Date()
): string[] {
  const cutoffTime = now.getTime() - THIRTY_DAYS_MS;

  return items
    .filter((item) => {
      if (item.status !== 'let_go' || !item.let_go_at) {
        return false;
      }
      const letGoTime = new Date(item.let_go_at).getTime();
      return letGoTime <= cutoffTime;
    })
    .map((item) => item.id);
}
