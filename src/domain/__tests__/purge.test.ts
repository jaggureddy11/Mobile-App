import { getExpiredLetGoItemIds } from '../purge';
import { Item } from '../types';

describe('Domain: Auto-purge Logic', () => {
  const baseDate = new Date('2026-03-01T12:00:00.000Z');

  const items: Item[] = [
    {
      id: 'recent-let-go',
      type: 'link',
      title: 'Recent let go (5 days ago)',
      minutes: 5,
      status: 'let_go',
      created_at: '2026-02-20T12:00:00.000Z',
      let_go_at: '2026-02-24T12:00:00.000Z', // 5 days ago
    },
    {
      id: 'expired-let-go',
      type: 'task',
      title: 'Expired let go (35 days ago)',
      minutes: 15,
      status: 'let_go',
      created_at: '2026-01-15T12:00:00.000Z',
      let_go_at: '2026-01-25T12:00:00.000Z', // 35 days ago
    },
    {
      id: 'exact-30-days',
      type: 'activity',
      title: 'Let go exactly 30 days ago',
      minutes: 30,
      status: 'let_go',
      created_at: '2026-01-20T12:00:00.000Z',
      let_go_at: '2026-01-30T12:00:00.000Z', // exactly 30 days ago
    },
    {
      id: 'done-item',
      type: 'link',
      title: 'Done item (never purged)',
      minutes: 5,
      status: 'done',
      created_at: '2025-01-01T12:00:00.000Z',
      done_at: '2025-01-02T12:00:00.000Z',
    },
    {
      id: 'pending-item',
      type: 'link',
      title: 'Pending item (never purged)',
      minutes: 5,
      status: 'pending',
      created_at: '2025-01-01T12:00:00.000Z',
    },
  ];

  it('identifies items let go >= 30 days ago for permanent purge', () => {
    const expired = getExpiredLetGoItemIds(items, baseDate);
    expect(expired).toContain('expired-let-go');
    expect(expired).toContain('exact-30-days');
    expect(expired).not.toContain('recent-let-go');
    expect(expired).not.toContain('done-item');
    expect(expired).not.toContain('pending-item');
  });

  it('returns empty array when no items are expired', () => {
    const activeOnly = items.filter((i) => i.status === 'pending');
    expect(getExpiredLetGoItemIds(activeOnly, baseDate)).toEqual([]);
  });
});
