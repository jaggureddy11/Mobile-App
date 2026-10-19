import { itemsRepo } from './itemsRepo';
import { Item } from '../domain/types';

export const INITIAL_SEED_ITEMS = [
  {
    type: 'reel' as const,
    title: 'Morning Routine for Creative Focus and Calm',
    url: 'https://instagram.com/reel/example',
    note: 'You wanted to do this once.',
    minutes: 15 as const,
  },
  {
    type: 'link' as const,
    title: 'The psychology of messy desks',
    url: 'https://example.com/messy-desks',
    note: 'Great perspective on physical spaces and mental clutter',
    minutes: 5 as const,
  },
  {
    type: 'task' as const,
    title: 'Email professor about the extension',
    note: 'Draft brief email asking for 48 hours extra on draft',
    minutes: 15 as const,
  },
  {
    type: 'activity' as const,
    title: 'Unplugged neighborhood walk with no headphones',
    note: 'Just notice 3 things you have never seen before',
    minutes: 30 as const,
  },
  {
    type: 'text' as const,
    title: 'Three gentle deep breaths right now',
    note: 'Inhale for 4, hold for 4, exhale for 6',
    minutes: 1 as const,
  },
];

export async function seedInitialItemsIfEmpty(): Promise<Item[]> {
  const existing = await itemsRepo.getAll();
  if (existing.length > 0) {
    return existing;
  }

  const created: Item[] = [];
  for (const item of INITIAL_SEED_ITEMS) {
    const res = await itemsRepo.create(item);
    created.push(res);
  }
  return created;
}
