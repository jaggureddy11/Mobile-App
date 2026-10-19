import { pickResurfacedItem } from '../resurface';
import { Item } from '../types';

describe('Domain: Resurfacing Algorithm', () => {
  const mockItems: Item[] = [
    {
      id: '1',
      type: 'reel',
      title: 'Morning stretch reel',
      minutes: 1,
      status: 'pending',
      created_at: '2026-01-01T10:00:00.000Z',
      resurfaced_at: null,
    },
    {
      id: '2',
      type: 'link',
      title: 'Psychology of messy desks',
      minutes: 5,
      status: 'pending',
      created_at: '2026-01-01T11:00:00.000Z',
      resurfaced_at: '2026-01-02T10:00:00.000Z',
    },
    {
      id: '3',
      type: 'task',
      title: 'Email professor',
      minutes: 15,
      status: 'pending',
      created_at: '2026-01-01T09:00:00.000Z',
      resurfaced_at: null,
    },
    {
      id: '4',
      type: 'activity',
      title: 'Deep reflection walk',
      minutes: 30,
      status: 'pending',
      created_at: '2026-01-01T08:00:00.000Z',
      resurfaced_at: null,
    },
    {
      id: '5',
      type: 'link',
      title: 'Already completed article',
      minutes: 5,
      status: 'done',
      created_at: '2026-01-01T07:00:00.000Z',
    },
    {
      id: '6',
      type: 'link',
      title: 'Let go article',
      minutes: 5,
      status: 'let_go',
      created_at: '2026-01-01T06:00:00.000Z',
    },
  ];

  it('filters out non-pending items', () => {
    const picked = pickResurfacedItem(mockItems, 5);
    expect(picked).not.toBeNull();
    expect(picked?.status).toBe('pending');
    expect(picked?.id).not.toBe('5');
    expect(picked?.id).not.toBe('6');
  });

  it('selects item fitting into selected minutes prioritizing never resurfaced (null resurfaced_at)', () => {
    // Both Item 1 (1 min, never resurfaced) and Item 2 (5 min, resurfaced on Jan 2) fit into 5 min.
    // Item 1 should be picked because it has resurfaced_at === null.
    const picked = pickResurfacedItem(mockItems, 5);
    expect(picked?.id).toBe('1');
  });

  it('excludes current item when cycling through items (Show something else)', () => {
    const picked = pickResurfacedItem(mockItems, 5, '1');
    expect(picked?.id).toBe('2');
  });

  it('picks 15 min task when 15 min selected and earlier in priority', () => {
    // When 15 min selected:
    // Candidates fitting <= 15 min: Item 1 (1m, null), Item 3 (15m, null), Item 2 (5m, Jan 2)
    // Between Item 1 and Item 3 (both null), Item 3 was created at 09:00 while Item 1 was created at 10:00.
    // So Item 3 comes first!
    const picked = pickResurfacedItem(mockItems, 15);
    expect(picked?.id).toBe('3');
  });

  it('returns null when no pending items exist', () => {
    const emptyList: Item[] = [];
    expect(pickResurfacedItem(emptyList, 15)).toBeNull();

    const allDone: Item[] = [
      { id: '1', type: 'link', title: 'Done', minutes: 5, status: 'done', created_at: '' },
    ];
    expect(pickResurfacedItem(allDone, 15)).toBeNull();
  });
});
