import { create } from 'zustand';
import { Item, CreateItemInput, MinuteOption } from './types';
import { itemsRepo } from '../db/itemsRepo';
import { pickResurfacedItem } from './resurface';
import { getExpiredLetGoItemIds } from './purge';
import { seedInitialItemsIfEmpty } from '../db/seed';

interface ItemsState {
  items: Item[];
  selectedMinutes: MinuteOption;
  activeItem: Item | null;
  isLoading: boolean;
  undoItem: Item | null;
  undoTimer: ReturnType<typeof setTimeout> | null;

  // Actions
  loadItems: () => Promise<void>;
  setSelectedMinutes: (minutes: MinuteOption) => void;
  addItem: (input: CreateItemInput) => Promise<Item>;
  doItem: (id: string) => Promise<void>;
  laterItem: (id: string) => Promise<void>;
  letGoItem: (id: string) => Promise<void>;
  undoLetGo: () => Promise<void>;
  nextResurfacedItem: () => void;
  runPurge: () => Promise<number>;
}

export const useItemsStore = create<ItemsState>((set, get) => ({
  items: [],
  selectedMinutes: 15,
  activeItem: null,
  isLoading: true,
  undoItem: null,
  undoTimer: null,

  loadItems: async () => {
    set({ isLoading: true });
    try {
      let items = await itemsRepo.getAll();
      if (items.length === 0) {
        items = await seedInitialItemsIfEmpty();
      }
      const { selectedMinutes, activeItem } = get();
      
      // Auto purge expired let_go items upon load
      const expiredIds = getExpiredLetGoItemIds(items);
      if (expiredIds.length > 0) {
        await itemsRepo.deleteMultiple(expiredIds);
      }
      
      const freshItems = expiredIds.length > 0 
        ? items.filter((i) => !expiredIds.includes(i.id))
        : items;

      const newActive = activeItem && freshItems.some((i) => i.id === activeItem.id && i.status === 'pending')
        ? activeItem
        : pickResurfacedItem(freshItems, selectedMinutes);

      set({ items: freshItems, activeItem: newActive, isLoading: false });
    } catch (err) {
      console.error('Failed to load items from database:', err);
      // Fallback to starter items in memory so UI never hangs in loading spinner
      const { selectedMinutes } = get();
      const fallbackItems = await seedInitialItemsIfEmpty().catch(() => []);
      const fallbackActive = pickResurfacedItem(fallbackItems, selectedMinutes);
      set({ items: fallbackItems, activeItem: fallbackActive, isLoading: false });
    }
  },

  setSelectedMinutes: (minutes: MinuteOption) => {
    const { items, activeItem } = get();
    // If active item already fits in new minutes and is pending, keep it; otherwise pick a new one
    const newActive =
      activeItem && activeItem.status === 'pending' && activeItem.minutes <= minutes
        ? activeItem
        : pickResurfacedItem(items, minutes);
    set({ selectedMinutes: minutes, activeItem: newActive });
  },

  addItem: async (input: CreateItemInput) => {
    const newItem = await itemsRepo.create(input);
    const { items, selectedMinutes, activeItem } = get();
    const updatedItems = [newItem, ...items];
    
    // If no active item, pick the newly added item if suitable
    const newActive = activeItem || pickResurfacedItem(updatedItems, selectedMinutes);

    set({ items: updatedItems, activeItem: newActive });
    return newItem;
  },

  doItem: async (id: string) => {
    await itemsRepo.updateStatus(id, 'done');
    const { items, selectedMinutes } = get();
    const updatedItems = items.map((i) => (i.id === id ? { ...i, status: 'done' as const, done_at: new Date().toISOString() } : i));
    const nextActive = pickResurfacedItem(updatedItems, selectedMinutes, id);
    set({ items: updatedItems, activeItem: nextActive });
  },

  laterItem: async (id: string) => {
    // Mark resurfaced_at so it moves down in priority
    await itemsRepo.markResurfaced(id);
    const now = new Date().toISOString();
    const { items, selectedMinutes } = get();
    const updatedItems = items.map((i) => (i.id === id ? { ...i, resurfaced_at: now } : i));
    const nextActive = pickResurfacedItem(updatedItems, selectedMinutes, id);
    set({ items: updatedItems, activeItem: nextActive });
  },

  letGoItem: async (id: string) => {
    const { items, undoTimer, selectedMinutes } = get();
    const targetItem = items.find((i) => i.id === id);
    if (!targetItem) return;

    if (undoTimer) {
      clearTimeout(undoTimer);
    }

    await itemsRepo.updateStatus(id, 'let_go');
    const now = new Date().toISOString();
    const updatedItems = items.map((i) => (i.id === id ? { ...i, status: 'let_go' as const, let_go_at: now } : i));
    const nextActive = pickResurfacedItem(updatedItems, selectedMinutes, id);

    // 5-second undo timer
    const timer = setTimeout(() => {
      set({ undoItem: null, undoTimer: null });
    }, 5000);

    set({
      items: updatedItems,
      activeItem: nextActive,
      undoItem: targetItem,
      undoTimer: timer,
    });
  },

  undoLetGo: async () => {
    const { undoItem, undoTimer, items, selectedMinutes } = get();
    if (!undoItem) return;

    if (undoTimer) {
      clearTimeout(undoTimer);
    }

    await itemsRepo.restore(undoItem.id);
    const updatedItems = items.map((i) => (i.id === undoItem.id ? { ...i, status: 'pending' as const, let_go_at: null } : i));
    
    set({
      items: updatedItems,
      activeItem: undoItem, // Bring back the restored item to view
      undoItem: null,
      undoTimer: null,
    });
  },

  nextResurfacedItem: () => {
    const { items, selectedMinutes, activeItem } = get();
    const next = pickResurfacedItem(items, selectedMinutes, activeItem?.id);
    if (next) {
      set({ activeItem: next });
    }
  },

  runPurge: async () => {
    const { items } = get();
    const expiredIds = getExpiredLetGoItemIds(items);
    if (expiredIds.length > 0) {
      await itemsRepo.deleteMultiple(expiredIds);
      const remaining = items.filter((i) => !expiredIds.includes(i.id));
      set({ items: remaining });
    }
    return expiredIds.length;
  },
}));
