export type SnoozeOption = 'tomorrow' | 'weekend' | 'next_week';

export interface ComputeSnoozeOptions {
  now?: Date;
  nudgeTime?: string; // Format "HH:mm", defaults to "19:00"
}

/**
 * Computes an absolute UTC ISO timestamp for snoozing an item.
 *
 * Options:
 * 1. 'tomorrow'  -> Tomorrow at nudge time (or 19:00 local)
 * 2. 'weekend'   -> This weekend (Saturday 10:00 local time)
 * 3. 'next_week' -> Next week (Monday at nudge time)
 *
 * Stores an absolute UTC timestamp string (e.g. 2026-10-21T13:30:00.000Z),
 * matching created_at and resurfaced_at format.
 */
export function computeSnooze(
  option: SnoozeOption,
  options: ComputeSnoozeOptions = {}
): string {
  const now = options.now ? new Date(options.now) : new Date();
  const nudgeTime = options.nudgeTime || '19:00';
  const [hourStr, minStr] = nudgeTime.split(':');
  const nudgeHour = parseInt(hourStr, 10) || 19;
  const nudgeMinute = parseInt(minStr, 10) || 0;

  const target = new Date(now.getTime());

  if (option === 'tomorrow') {
    // Tomorrow at nudge time
    target.setDate(target.getDate() + 1);
    target.setHours(nudgeHour, nudgeMinute, 0, 0);
  } else if (option === 'weekend') {
    // This weekend (Saturday 10:00 local)
    // Sunday is 0, Monday 1, ..., Saturday 6
    const currentDay = target.getDay();
    let daysUntilSaturday = (6 - currentDay + 7) % 7;

    // If today is Saturday but already past 10:00, or today is Sunday, snooze to next Saturday
    if (currentDay === 6) {
      const today10am = new Date(now.getTime());
      today10am.setHours(10, 0, 0, 0);
      if (now.getTime() >= today10am.getTime()) {
        daysUntilSaturday = 7;
      }
    } else if (currentDay === 0) {
      daysUntilSaturday = 6;
    }

    target.setDate(target.getDate() + daysUntilSaturday);
    target.setHours(10, 0, 0, 0);
  } else if (option === 'next_week') {
    // Next week (Monday at nudge time)
    // Sunday is 0, Monday 1, Tuesday 2...
    const currentDay = target.getDay();
    let daysUntilMonday = (1 - currentDay + 7) % 7;

    // If today is Monday or daysUntilMonday === 0, push to next Monday (+7 days)
    if (daysUntilMonday === 0) {
      daysUntilMonday = 7;
    }

    target.setDate(target.getDate() + daysUntilMonday);
    target.setHours(nudgeHour, nudgeMinute, 0, 0);
  }

  return target.toISOString();
}
