import { create } from 'zustand';
import { Collection } from './types';
import { collectionsRepo } from '../db/collectionsRepo';

interface CollectionsState {
  collections: Collection[];
  activeCollectionId: string | null;
  isLoading: boolean;

  loadCollections: () => Promise<void>;
  createCollection: (name: string, color?: string) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<void>;
  setActiveCollectionId: (id: string | null) => void;
}

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  collections: [],
  activeCollectionId: null,
  isLoading: true,

  loadCollections: async () => {
    set({ isLoading: true });
    try {
      const collections = await collectionsRepo.getAll();
      set({ collections, isLoading: false });
    } catch (err) {
      console.error('Failed to load collections:', err);
      set({ isLoading: false });
    }
  },

  createCollection: async (name: string, color?: string) => {
    const newCol = await collectionsRepo.create(name, color);
    const { collections } = get();
    set({ collections: [...collections, newCol] });
    return newCol;
  },

  deleteCollection: async (id: string) => {
    await collectionsRepo.delete(id);
    const { collections, activeCollectionId } = get();
    set({
      collections: collections.filter((c) => c.id !== id),
      activeCollectionId: activeCollectionId === id ? null : activeCollectionId,
    });
  },

  setActiveCollectionId: (id: string | null) => {
    set({ activeCollectionId: id });
  },
}));
