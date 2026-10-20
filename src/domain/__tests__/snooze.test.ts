import { computeSnooze } from '../snooze';

describe('Domain Snooze: UTC Timestamp Generation', () => {
  it('computes tomorrow at custom nudge time in UTC ISO format', () => {
    // Wednesday 2026-10-21 14:00:00
    const now = new Date('2026-10-21T14:00:00Z');
    const snoozeIso = computeSnooze('tomorrow', { now, nudgeTime: '19:00' });
    const target = new Date(snoozeIso);

    // Should be valid ISO string
    expect(snoozeIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    // Must be in future
    expect(target.getTime()).toBeGreaterThan(now.getTime());
  });

  it('computes this weekend (Saturday 10:00 local)', () => {
    // Wednesday 2026-10-21
    const wednesday = new Date('2026-10-21T10:00:00');
    const snoozeIso = computeSnooze('weekend', { now: wednesday });
    const target = new Date(snoozeIso);

    // Target day should be Saturday (6)
    expect(target.getDay()).toBe(6);
    expect(target.getHours()).toBe(10);
    expect(target.getMinutes()).toBe(0);
    expect(target.getTime()).toBeGreaterThan(wednesday.getTime());
  });

  it('computes next week (Monday at nudge time)', () => {
    // Wednesday 2026-10-21
    const wednesday = new Date('2026-10-21T10:00:00');
    const snoozeIso = computeSnooze('next_week', { now: wednesday, nudgeTime: '18:30' });
    const target = new Date(snoozeIso);

    // Target day should be Monday (1)
    expect(target.getDay()).toBe(1);
    expect(target.getHours()).toBe(18);
    expect(target.getMinutes()).toBe(30);
    expect(target.getTime()).toBeGreaterThan(wednesday.getTime());
  });
});
