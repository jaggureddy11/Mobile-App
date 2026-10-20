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

  describe('Weekend and Sunday Edge Cases', () => {
    it('snoozes to SAME day Saturday 10:00 if currently Saturday before 10:00 AM', () => {
      // Saturday 2026-10-24 08:30:00
      const satEarly = new Date('2026-10-24T08:30:00');
      const snoozeIso = computeSnooze('weekend', { now: satEarly });
      const target = new Date(snoozeIso);

      expect(target.getDay()).toBe(6);
      expect(target.getDate()).toBe(24);
      expect(target.getHours()).toBe(10);
      expect(target.getMinutes()).toBe(0);
      expect(target.getTime()).toBeGreaterThan(satEarly.getTime());
    });

    it('snoozes to NEXT Saturday (+7 days) 10:00 if currently Saturday after 10:00 AM', () => {
      // Saturday 2026-10-24 11:30:00
      const satLate = new Date('2026-10-24T11:30:00');
      const snoozeIso = computeSnooze('weekend', { now: satLate });
      const target = new Date(snoozeIso);

      expect(target.getDay()).toBe(6);
      expect(target.getDate()).toBe(31); // Next Saturday
      expect(target.getHours()).toBe(10);
      expect(target.getMinutes()).toBe(0);
      expect(target.getTime()).toBeGreaterThan(satLate.getTime());
    });

    it('snoozes to upcoming Saturday (+6 days) 10:00 if currently Sunday', () => {
      // Sunday 2026-10-25 14:00:00
      const sunday = new Date('2026-10-25T14:00:00');
      const snoozeIso = computeSnooze('weekend', { now: sunday });
      const target = new Date(snoozeIso);

      expect(target.getDay()).toBe(6);
      expect(target.getDate()).toBe(31); // Upcoming Saturday
      expect(target.getHours()).toBe(10);
      expect(target.getMinutes()).toBe(0);
      expect(target.getTime()).toBeGreaterThan(sunday.getTime());
    });

    it('snoozes next_week to next day Monday when currently Sunday', () => {
      // Sunday 2026-10-25 15:00:00
      const sunday = new Date('2026-10-25T15:00:00');
      const snoozeIso = computeSnooze('next_week', { now: sunday, nudgeTime: '19:00' });
      const target = new Date(snoozeIso);

      expect(target.getDay()).toBe(1); // Monday
      expect(target.getDate()).toBe(26);
      expect(target.getHours()).toBe(19);
      expect(target.getMinutes()).toBe(0);
      expect(target.getTime()).toBeGreaterThan(sunday.getTime());
    });

    it('snoozes next_week to next Monday (+7 days) when currently Monday', () => {
      // Monday 2026-10-26 10:00:00
      const monday = new Date('2026-10-26T10:00:00');
      const snoozeIso = computeSnooze('next_week', { now: monday, nudgeTime: '19:00' });
      const target = new Date(snoozeIso);

      expect(target.getDay()).toBe(1);
      expect(target.getDate()).toBe(2); // Nov 2
      expect(target.getHours()).toBe(19);
      expect(target.getMinutes()).toBe(0);
      expect(target.getTime()).toBeGreaterThan(monday.getTime());
    });
  });

  describe('Daylight Saving Time (DST) Transitions', () => {
    it('preserves user local nudge time across DST boundaries', () => {
      // Spring forward or Fall back (e.g. US DST ends on first Sunday in November: 2026-11-01)
      const dayBeforeDst = new Date('2026-10-31T15:00:00');
      const snoozeIso = computeSnooze('tomorrow', { now: dayBeforeDst, nudgeTime: '19:00' });
      const target = new Date(snoozeIso);

      expect(target.getDate()).toBe(1);
      expect(target.getMonth()).toBe(10); // November
      // Local wall-clock hour must still resolve to 19:00
      expect(target.getHours()).toBe(19);
      expect(target.getMinutes()).toBe(0);
      expect(snoozeIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
