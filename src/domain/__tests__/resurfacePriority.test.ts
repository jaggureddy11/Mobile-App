import { pickResurfacedItem } from '../resurface';
import { Item } from '../types';

describe('Resurface Algorithm: Priority Ordering & Fallback Behavior', () => {
  const itemA: Item = {
    id: 'item-a',
    type: 'link',
    title: 'Item A (Surfaced twice, older)',
    minutes: 5,
    status: 'pending',
    created_at: '2026-10-01T10:00:00Z',
    times_surfaced: 2,
    resurfaced_at: '2026-10-15T12:00:00Z',
  };

  const itemB: Item = {
    id: 'item-b',
    type: 'link',
    title: 'Item B (Surfaced zero times, newer)',
    minutes: 5,
    status: 'pending',
    created_at: '2026-10-10T10:00:00Z',
    times_surfaced: 0,
    resurfaced_at: null,
  };

  const itemC: Item = {
    id: 'item-c',
    type: 'link',
    title: 'Item C (Surfaced once)',
    minutes: 5,
    status: 'pending',
    created_at: '2026-10-05T10:00:00Z',
    times_surfaced: 1,
    resurfaced_at: '2026-10-12T12:00:00Z',
  };

  it('prioritizes item with fewest times_surfaced (times_surfaced ASC)', () => {
    const picked = pickResurfacedItem([itemA, itemB, itemC], 5);
    expect(picked?.id).toBe('item-b'); // times_surfaced: 0
  });

  it('prioritizes unseen item (null resurfaced_at) over previously surfaced when times_surfaced is equal', () => {
    const itemD: Item = {
      ...itemB,
      id: 'item-d',
      times_surfaced: 1,
      resurfaced_at: null,
      created_at: '2026-10-11T10:00:00Z',
    };
    const itemE: Item = {
      ...itemC,
      id: 'item-e',
      times_surfaced: 1,
      resurfaced_at: '2026-10-12T12:00:00Z',
      created_at: '2026-10-02T10:00:00Z',
    };

    const picked = pickResurfacedItem([itemE, itemD], 5);
    expect(picked?.id).toBe('item-d'); // null resurfaced_at prioritized
  });

  it('prioritizes older created_at when times_surfaced and resurfaced_at are equal', () => {
    const older: Item = {
      ...itemB,
      id: 'item-older',
      created_at: '2026-10-01T10:00:00Z',
    };
    const newer: Item = {
      ...itemB,
      id: 'item-newer',
      created_at: '2026-10-15T10:00:00Z',
    };

    const picked = pickResurfacedItem([newer, older], 5);
    expect(picked?.id).toBe('item-older');
  });

  it('returns null when allowFallback is false and no items fit selectedMinutes', () => {
    const thirtyMinItem: Item = {
      id: 'item-30',
      type: 'activity',
      title: 'Long 30 min item',
      minutes: 30,
      status: 'pending',
      created_at: '2026-10-01T10:00:00Z',
      times_surfaced: 0,
    };

    // Selecting 5 min chip with allowFallback: false
    const pickedStrict = pickResurfacedItem([thirtyMinItem], 5, null, { allowFallback: false });
    expect(pickedStrict).toBeNull();

    // Selecting 5 min chip with allowFallback: true
    const pickedFallback = pickResurfacedItem([thirtyMinItem], 5, null, { allowFallback: true });
    expect(pickedFallback?.id).toBe('item-30');
  });
});
