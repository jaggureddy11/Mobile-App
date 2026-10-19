import { useItemsStore } from '../useItemsStore';
import { itemsRepo } from '../../db/itemsRepo';
import { Item } from '../types';

jest.mock('../../db/itemsRepo');

const mockItems: Item[] = [
  {
    id: '1',
    type: 'link',
    title: 'Item 1',
    minutes: 5,
    status: 'pending',
    created_at: '2026-01-01T10:00:00.000Z',
    resurfaced_at: null,
  },
  {
    id: '2',
    type: 'task',
    title: 'Item 2',
    minutes: 15,
    status: 'pending',
    created_at: '2026-01-01T11:00:00.000Z',
    resurfaced_at: null,
  },
];

describe('Domain: useItemsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (itemsRepo.getAll as jest.Mock).mockResolvedValue([...mockItems]);
    (itemsRepo.deleteMultiple as jest.Mock).mockResolvedValue(undefined);
    (itemsRepo.create as jest.Mock).mockImplementation((input) =>
      Promise.resolve({
        id: 'new-id',
        type: input.type,
        title: input.title,
        minutes: input.minutes ?? 15,
        status: 'pending',
        created_at: '2026-01-02T10:00:00.000Z',
      })
    );
    (itemsRepo.updateStatus as jest.Mock).mockResolvedValue(undefined);
    (itemsRepo.markResurfaced as jest.Mock).mockResolvedValue(undefined);
    (itemsRepo.restore as jest.Mock).mockResolvedValue(undefined);

    useItemsStore.setState({
      items: [],
      selectedMinutes: 15,
      activeItem: null,
      isLoading: true,
      undoItem: null,
      undoTimer: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads items and sets active resurfaced item', async () => {
    await useItemsStore.getState().loadItems();

    const state = useItemsStore.getState();
    expect(state.items.length).toBe(2);
    expect(state.activeItem).not.toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('switches selected duration and recalculates active item', async () => {
    await useItemsStore.getState().loadItems();

    // 5 minutes should pick Item 1 (5 min) instead of Item 2 (15 min)
    useItemsStore.getState().setSelectedMinutes(5);

    const state = useItemsStore.getState();
    expect(state.selectedMinutes).toBe(5);
    expect(state.activeItem?.id).toBe('1');
  });

  it('marks an item as let_go and initiates 5-second undo timer', async () => {
    await useItemsStore.getState().loadItems();
    await useItemsStore.getState().letGoItem('1');

    expect(useItemsStore.getState().undoItem?.id).toBe('1');
    expect(itemsRepo.updateStatus).toHaveBeenCalledWith('1', 'let_go');

    // Fast-forward 5 seconds
    jest.advanceTimersByTime(5000);

    expect(useItemsStore.getState().undoItem).toBeNull();
  });

  it('restores an item when undoLetGo is called within 5 seconds', async () => {
    await useItemsStore.getState().loadItems();
    await useItemsStore.getState().letGoItem('1');

    expect(useItemsStore.getState().undoItem?.id).toBe('1');

    await useItemsStore.getState().undoLetGo();

    expect(itemsRepo.restore).toHaveBeenCalledWith('1');
    expect(useItemsStore.getState().undoItem).toBeNull();
    expect(useItemsStore.getState().activeItem?.id).toBe('1');
  });
});
