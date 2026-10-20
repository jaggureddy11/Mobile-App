import { create } from 'zustand';
import { Item, CreateItemInput, MinuteOption, SnoozeOption } from './types';
import { itemsRepo } from '../db/itemsRepo';
import { settingsRepo } from '../db/settingsRepo';
import { pickResurfacedItem } from './resurface';
import { computeSnooze } from './snooze';
import { getExpiredLetGoItemIds } from './purge';
import { seedInitialItemsIfEmpty } from '../db/seed';
import { requestNotificationPermission, scheduleNudgeNotification } from '../platform/notifications';

interface ItemsState {
  items: Item[];
  selectedMinutes: MinuteOption;
  activeItem: Item | null;
  isLoading: boolean;
  undoItem: Item | null;
  undoTimer: ReturnType<typeof setTimeout> | null;
  currentSurfaceEventId: string | null;

  // Actions
  loadItems: () => Promise<void>;
  setSelectedMinutes: (minutes: MinuteOption) => void;
  addItem: (input: CreateItemInput) => Promise<Item>;
  doItem: (id: string) => Promise<void>;
  laterItem: (id: string) => Promise<void>;
  snoozeItem: (id: string, option: SnoozeOption) => Promise<void>;
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
  currentSurfaceEventId: null,

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
        : pickResurfacedItem(freshItems, selectedMinutes, null, { allowFallback: false });

      let eventId: string | null = null;
      if (newActive) {
        try {
          eventId = await itemsRepo.recordSurfaceEvent(newActive.id, selectedMinutes);
        } catch {}
      }

      set({
        items: freshItems,
        activeItem: newActive,
        currentSurfaceEventId: eventId,
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to load items from database:', err);
      // Fallback to starter items in memory so UI never hangs in loading spinner
      const { selectedMinutes } = get();
      const fallbackItems = await seedInitialItemsIfEmpty().catch(() => []);
      const fallbackActive = pickResurfacedItem(fallbackItems, selectedMinutes, null, { allowFallback: false });
      set({ items: fallbackItems, activeItem: fallbackActive, currentSurfaceEventId: null, isLoading: false });
    }
  },

  setSelectedMinutes: (minutes: MinuteOption) => {
    const { items, activeItem, currentSurfaceEventId } = get();
    // If active item already fits in new minutes and is pending, keep it; otherwise pick a new one
    const fitsCurrent =
      activeItem && activeItem.status === 'pending' && activeItem.minutes <= minutes;

    if (fitsCurrent) {
      set({ selectedMinutes: minutes });
      return;
    }

    if (currentSurfaceEventId) {
      itemsRepo.recordSurfaceAction(currentSurfaceEventId, 'skip').catch(() => {});
    }

    const newActive = pickResurfacedItem(items, minutes, null, { allowFallback: false });

    if (newActive) {
      itemsRepo.recordSurfaceEvent(newActive.id, minutes)
        .then((eventId) => set({ currentSurfaceEventId: eventId }))
        .catch(() => {});
    } else {
      set({ currentSurfaceEventId: null });
    }

    set({ selectedMinutes: minutes, activeItem: newActive });
  },

  addItem: async (input: CreateItemInput) => {
    const { items, selectedMinutes, activeItem } = get();
    const isFirstSave = items.length === 0;

    const newItem = await itemsRepo.create(input);
    const updatedItems = [newItem, ...items];
    
    // If this is the user's first save, request notification permission
    if (isFirstSave) {
      requestNotificationPermission()
        .then(async (granted) => {
          if (granted) {
            const settings = await settingsRepo.getSettings();
            await scheduleNudgeNotification(settings);
          }
        })
        .catch(() => {});
    }

    // If no active item, pick the newly added item if suitable
    const newActive = activeItem || pickResurfacedItem(updatedItems, selectedMinutes, null, { allowFallback: false });
    let eventId = get().currentSurfaceEventId;

    if (!activeItem && newActive) {
      try {
        eventId = await itemsRepo.recordSurfaceEvent(newActive.id, selectedMinutes);
      } catch {}
    }

    set({ items: updatedItems, activeItem: newActive, currentSurfaceEventId: eventId });
    return newItem;
  },

  doItem: async (id: string) => {
    const { currentSurfaceEventId, items, selectedMinutes } = get();
    if (currentSurfaceEventId) {
      await itemsRepo.recordSurfaceAction(currentSurfaceEventId, 'do').catch(() => {});
    }

    await itemsRepo.updateStatus(id, 'done');
    const updatedItems = items.map((i) =>
      i.id === id ? { ...i, status: 'done' as const, done_at: new Date().toISOString() } : i
    );
    const nextActive = pickResurfacedItem(updatedItems, selectedMinutes, id, { allowFallback: false });

    let nextEventId: string | null = null;
    if (nextActive) {
      try {
        nextEventId = await itemsRepo.recordSurfaceEvent(nextActive.id, selectedMinutes);
      } catch {}
    }

    set({ items: updatedItems, activeItem: nextActive, currentSurfaceEventId: nextEventId });
  },

  laterItem: async (id: string) => {
    // Default snooze: tomorrow
    return get().snoozeItem(id, 'tomorrow');
  },

  snoozeItem: async (id: string, option: SnoozeOption) => {
    const { currentSurfaceEventId, items, selectedMinutes } = get();
    if (currentSurfaceEventId) {
      await itemsRepo.recordSurfaceAction(currentSurfaceEventId, 'later').catch(() => {});
    }

    const settings = await settingsRepo.getSettings().catch(() => null);
    const snoozedUntil = computeSnooze(option, { nudgeTime: settings?.nudge_time || '19:00' });

    await itemsRepo.snooze(id, snoozedUntil);
    const now = new Date().toISOString();
    const updatedItems = items.map((i) =>
      i.id === id ? { ...i, snoozed_until: snoozedUntil, resurfaced_at: now } : i
    );

    const nextActive = pickResurfacedItem(updatedItems, selectedMinutes, id, { allowFallback: false });

    let nextEventId: string | null = null;
    if (nextActive) {
      try {
        nextEventId = await itemsRepo.recordSurfaceEvent(nextActive.id, selectedMinutes);
      } catch {}
    }

    set({ items: updatedItems, activeItem: nextActive, currentSurfaceEventId: nextEventId });
  },

  letGoItem: async (id: string) => {
    const { currentSurfaceEventId, items, undoTimer, selectedMinutes } = get();
    const targetItem = items.find((i) => i.id === id);
    if (!targetItem) return;

    if (currentSurfaceEventId) {
      await itemsRepo.recordSurfaceAction(currentSurfaceEventId, 'let_go').catch(() => {});
    }

    if (undoTimer) {
      clearTimeout(undoTimer);
    }

    await itemsRepo.updateStatus(id, 'let_go');
    const now = new Date().toISOString();
    const updatedItems = items.map((i) =>
      i.id === id ? { ...i, status: 'let_go' as const, let_go_at: now } : i
    );
    const nextActive = pickResurfacedItem(updatedItems, selectedMinutes, id, { allowFallback: false });

    let nextEventId: string | null = null;
    if (nextActive) {
      try {
        nextEventId = await itemsRepo.recordSurfaceEvent(nextActive.id, selectedMinutes);
      } catch {}
    }

    // 5-second undo timer
    const timer = setTimeout(() => {
      set({ undoItem: null, undoTimer: null });
    }, 5000);

    set({
      items: updatedItems,
      activeItem: nextActive,
      currentSurfaceEventId: nextEventId,
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
    const updatedItems = items.map((i) =>
      i.id === undoItem.id ? { ...i, status: 'pending' as const, let_go_at: null } : i
    );

    let eventId: string | null = null;
    try {
      eventId = await itemsRepo.recordSurfaceEvent(undoItem.id, selectedMinutes);
    } catch {}

    set({
      items: updatedItems,
      activeItem: undoItem, // Bring back the restored item to view
      currentSurfaceEventId: eventId,
      undoItem: null,
      undoTimer: null,
    });
  },

  nextResurfacedItem: () => {
    const { currentSurfaceEventId, items, selectedMinutes, activeItem } = get();
    if (currentSurfaceEventId) {
      itemsRepo.recordSurfaceAction(currentSurfaceEventId, 'skip').catch(() => {});
    }

    const next = pickResurfacedItem(items, selectedMinutes, activeItem?.id, { allowFallback: false });
    if (next) {
      itemsRepo.recordSurfaceEvent(next.id, selectedMinutes)
        .then((eventId) => set({ currentSurfaceEventId: eventId }))
        .catch(() => {});
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

