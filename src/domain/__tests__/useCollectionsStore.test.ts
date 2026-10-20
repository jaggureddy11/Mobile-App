import { useCollectionsStore } from '../useCollectionsStore';
import { collectionsRepo } from '../../db/collectionsRepo';
import { Collection } from '../types';

jest.mock('../../db/collectionsRepo');

const mockCollections: Collection[] = [
  {
    id: 'c1',
    name: 'Mindful Reads',
    color: '#D4C4B0',
    created_at: '2026-01-01T10:00:00.000Z',
    item_count: 3,
  },
  {
    id: 'c2',
    name: 'Focus Tasks',
    color: '#8A7E72',
    created_at: '2026-01-02T10:00:00.000Z',
    item_count: 1,
  },
];

describe('Domain: useCollectionsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (collectionsRepo.getAll as jest.Mock).mockResolvedValue([...mockCollections]);
    (collectionsRepo.create as jest.Mock).mockImplementation((name, color) =>
      Promise.resolve({
        id: 'c-new',
        name,
        color: color || '#8A7E72',
        created_at: '2026-01-03T10:00:00.000Z',
        item_count: 0,
      })
    );
    (collectionsRepo.delete as jest.Mock).mockResolvedValue(undefined);

    useCollectionsStore.setState({
      collections: [],
      activeCollectionId: null,
      isLoading: true,
    });
  });

  it('loads collections into state', async () => {
    await useCollectionsStore.getState().loadCollections();
    const state = useCollectionsStore.getState();
    expect(state.collections.length).toBe(2);
    expect(state.isLoading).toBe(false);
  });

  it('creates a new collection and appends to state', async () => {
    await useCollectionsStore.getState().loadCollections();
    const created = await useCollectionsStore.getState().createCollection('Weekend Inspos');
    
    expect(created.name).toBe('Weekend Inspos');
    const state = useCollectionsStore.getState();
    expect(state.collections.length).toBe(3);
    expect(collectionsRepo.create).toHaveBeenCalledWith('Weekend Inspos', undefined);
  });

  it('deletes a collection and updates state', async () => {
    await useCollectionsStore.getState().loadCollections();
    await useCollectionsStore.getState().deleteCollection('c1');

    const state = useCollectionsStore.getState();
    expect(state.collections.length).toBe(1);
    expect(state.collections[0].id).toBe('c2');
    expect(collectionsRepo.delete).toHaveBeenCalledWith('c1');
  });

  it('sets active collection id', () => {
    useCollectionsStore.getState().setActiveCollectionId('c2');
    expect(useCollectionsStore.getState().activeCollectionId).toBe('c2');
  });
});
