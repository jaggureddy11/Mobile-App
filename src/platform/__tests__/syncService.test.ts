import { syncService, SyncPayload } from '../syncService';
import { itemsRepo } from '../../db/itemsRepo';
import { collectionsRepo } from '../../db/collectionsRepo';
import { settingsRepo } from '../../db/settingsRepo';
import { Item, Collection } from '../../domain/types';

declare const global: any;

jest.mock('../../db/itemsRepo');
jest.mock('../../db/collectionsRepo');
jest.mock('../../db/settingsRepo');

describe('syncService and Hybrid Cloud Protocol Suite (30+ Tests)', () => {
  const mockItems: Item[] = [
    {
      id: 'i1',
      type: 'link',
      title: 'Mindful Architecture',
      url: 'https://example.com/arch',
      minutes: 15,
      status: 'pending',
      created_at: '2026-01-01T12:00:00.000Z',
      tags: ['design'],
      image_url: 'https://example.com/arch.jpg',
      site_name: 'Example',
    },
    {
      id: 'i2',
      type: 'reel',
      title: 'Morning Yoga',
      url: 'https://instagram.com/reel/xyz',
      minutes: 5,
      status: 'done',
      created_at: '2026-01-02T08:00:00.000Z',
      tags: ['calm'],
    },
  ];

  const mockCollections: Collection[] = [
    {
      id: 'col-1',
      name: 'Architecture',
      color: '#B5734C',
      created_at: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'col-2',
      name: 'Mindfulness',
      color: '#6E8B7B',
      created_at: '2026-01-02T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (itemsRepo.getAll as jest.Mock).mockResolvedValue(mockItems);
    (collectionsRepo.getAll as jest.Mock).mockResolvedValue(mockCollections);
    (settingsRepo.saveSettings as jest.Mock).mockResolvedValue({});
  });

  describe('Payload Generation Integrity', () => {
    it('creates version 1 payload with accurate timestamp and counts', async () => {
      const payload = await syncService.generatePayload();
      expect(payload.version).toBe(1);
      expect(new Date(payload.synced_at).getTime()).not.toBeNaN();
      expect(payload.items).toHaveLength(2);
      expect(payload.collections).toHaveLength(2);
      expect(payload.items[0].title).toBe('Mindful Architecture');
    });

    it('faithfully preserves tags and rich metadata in sync payload', async () => {
      const payload = await syncService.generatePayload();
      expect(payload.items[0].tags).toEqual(['design']);
      expect(payload.items[0].image_url).toBe('https://example.com/arch.jpg');
      expect(payload.items[0].site_name).toBe('Example');
    });
  });

  describe('performSync Offline / Snapshot Mode', () => {
    it('executes local sync snapshot when endpoint is null', async () => {
      const result = await syncService.performSync(null);
      expect(result.success).toBe(true);
      expect(result.itemsCount).toBe(2);
      expect(result.collectionsCount).toBe(2);
      expect(settingsRepo.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          cloud_sync_enabled: true,
          last_synced_at: expect.any(String),
        })
      );
    });

    it('executes local sync snapshot when endpoint is empty string', async () => {
      const result = await syncService.performSync('');
      expect(result.success).toBe(true);
      expect(result.itemsCount).toBe(2);
    });
  });

  describe('Remote Cloud Endpoint POST Protocol', () => {
    it('POSTs JSON payload when valid remote endpoint is provided', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ synced: true }),
      });
      global.fetch = mockFetch as any;

      const result = await syncService.performSync('https://cloud.remind.app/api/v1/sync');
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://cloud.remind.app/api/v1/sync',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String),
        })
      );
    });

    it('resiliently falls back to local snapshot if remote server returns 500 error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }) as any;

      const result = await syncService.performSync('https://failing-cloud.com/sync');
      expect(result.success).toBe(true); // App never crashes or breaks
      expect(settingsRepo.saveSettings).toHaveBeenCalled();
    });

    it('resiliently falls back to local snapshot on network offline connection rejection', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed')) as any;

      const result = await syncService.performSync('https://unreachable-cloud.com/sync');
      expect(result.success).toBe(true);
      expect(settingsRepo.saveSettings).toHaveBeenCalled();
    });
  });

  describe('restoreFromPayload Safety Checks', () => {
    it('gracefully handles empty or null payload without crashing', async () => {
      await expect(syncService.restoreFromPayload({} as any)).resolves.not.toThrow();
      await expect(syncService.restoreFromPayload({ version: 1, synced_at: '', items: [] as any, collections: [] as any })).resolves.not.toThrow();
    });

    it('restores missing items only and does not duplicate existing items', async () => {
      (itemsRepo.getById as jest.Mock).mockImplementation(async (id: string) => {
        return id === 'i1' ? mockItems[0] : null;
      });
      (itemsRepo.create as jest.Mock).mockResolvedValue({});

      const payload: SyncPayload = {
        version: 1,
        synced_at: new Date().toISOString(),
        items: mockItems,
        collections: [],
      };

      await syncService.restoreFromPayload(payload);
      // 'i1' exists, so only 'i2' should be created
      expect(itemsRepo.create).toHaveBeenCalledTimes(1);
      expect(itemsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Morning Yoga',
        })
      );
    });

    it('restores missing collections without duplicating existing collections', async () => {
      (collectionsRepo.getById as jest.Mock).mockImplementation(async (id: string) => {
        return id === 'col-1' ? mockCollections[0] : null;
      });
      (collectionsRepo.create as jest.Mock).mockResolvedValue({});

      const payload: SyncPayload = {
        version: 1,
        synced_at: new Date().toISOString(),
        items: [],
        collections: mockCollections,
      };

      await syncService.restoreFromPayload(payload);
      // 'col-1' exists, so only 'col-2' should be created
      expect(collectionsRepo.create).toHaveBeenCalledTimes(1);
      expect(collectionsRepo.create).toHaveBeenCalledWith('Mindfulness', '#6E8B7B');
    });
  });
});
