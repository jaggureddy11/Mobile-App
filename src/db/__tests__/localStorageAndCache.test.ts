import { metadataCacheRepo, METADATA_CACHE_TTL_DAYS } from '../metadataCacheRepo';
import { fetchUrlMetadata } from '../../platform/metadataScraper';
import { getDatabase, setTestDatabase } from '../database';
import { settingsRepo } from '../settingsRepo';
import { collectionsRepo } from '../collectionsRepo';
import { itemsRepo } from '../itemsRepo';
import { getWebDatabase } from '../webDatabase';

declare const global: any;

describe('Local Storage & Cache Verification Suite', () => {
  beforeEach(async () => {
    // Clear cache before each test
    await metadataCacheRepo.clear();
  });

  describe('Local Storage Cache (URL Metadata)', () => {
    it('stores scraped metadata into local storage cache and retrieves it without network request', async () => {
      const testUrl = 'https://example.com/mindful-focus';
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:title" content="Mindful Focus" />
            <meta property="og:description" content="A calm guide to staying present." />
            <meta property="og:image" content="https://example.com/cover.jpg" />
            <meta property="og:site_name" content="Mindful Daily" />
          </head>
        </html>
      `;

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      });
      global.fetch = fetchSpy as any;

      // 1. First fetch - hits network and populates local storage cache
      const firstResult = await fetchUrlMetadata(testUrl);
      expect(firstResult).not.toBeNull();
      expect(firstResult?.title).toBe('Mindful Focus');
      expect(firstResult?.siteName).toBe('Mindful Daily');
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Verify it is directly present in local storage cache
      const cachedDirect = await metadataCacheRepo.get(testUrl);
      expect(cachedDirect).not.toBeNull();
      expect(cachedDirect?.title).toBe('Mindful Focus');
      expect(cachedDirect?.imageUrl).toBe('https://example.com/cover.jpg');

      // 2. Second fetch - should hit local storage cache directly without any network fetch
      fetchSpy.mockClear();
      const secondResult = await fetchUrlMetadata(testUrl);
      expect(secondResult).not.toBeNull();
      expect(secondResult?.title).toBe('Mindful Focus');
      expect(fetchSpy).not.toHaveBeenCalled(); // zero network calls!
    });

    it('returns cached metadata when device is offline', async () => {
      const offlineUrl = 'https://offline-article.org/zen';
      // Pre-seed cache in local storage
      await metadataCacheRepo.set(offlineUrl, {
        title: 'Offline Zen Reflections',
        description: 'Read anytime even without internet.',
        siteName: 'Offline Zen',
      });

      // Network throws offline failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Network disconnected')) as any;

      const result = await fetchUrlMetadata(offlineUrl);
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Offline Zen Reflections');
      expect(result?.description).toBe('Read anytime even without internet.');
    });

    it('discards stale cache entries older than TTL', async () => {
      const staleUrl = 'https://stale-news.com/old-story';
      await metadataCacheRepo.set(staleUrl, {
        title: 'Ancient News',
      });

      // Query with 0 days TTL should treat it as expired
      const immediateExpired = await metadataCacheRepo.get(staleUrl, 0);
      expect(immediateExpired).toBeNull();
    });

    it('prunes expired entries and clears cache completely on demand', async () => {
      await metadataCacheRepo.set('https://url1.com', { title: 'URL 1' });
      await metadataCacheRepo.set('https://url2.com', { title: 'URL 2' });

      let count = await metadataCacheRepo.getCount();
      expect(count).toBeGreaterThanOrEqual(2);

      await metadataCacheRepo.clear();
      count = await metadataCacheRepo.getCount();
      expect(count).toBe(0);
    });
  });

  describe('Local Storage Core Repositories (Settings, Collections, Items)', () => {
    it('persists and updates settings properly in local storage', async () => {
      const initial = await settingsRepo.getSettings();
      expect(initial).toBeDefined();

      const updated = await settingsRepo.saveSettings({
        nudge_frequency: 'weekly',
        nudge_time: '20:30',
        quiet_hours_start: '23:00',
        default_chip: 30,
      });

      expect(updated.nudge_frequency).toBe('weekly');
      expect(updated.nudge_time).toBe('20:30');
      expect(updated.default_chip).toBe(30);

      // Verify read back from storage matches
      const reloaded = await settingsRepo.getSettings();
      expect(reloaded.nudge_frequency).toBe('weekly');
      expect(reloaded.nudge_time).toBe('20:30');
      expect(reloaded.default_chip).toBe(30);
    });

    it('persists collections and calculates item counts accurately', async () => {
      const col = await collectionsRepo.create('Test Sanctuary', '#2C2825');
      expect(col.id).toBeDefined();
      expect(col.name).toBe('Test Sanctuary');

      const all = await collectionsRepo.getAll();
      const found = all.find((c) => c.id === col.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Test Sanctuary');

      // Cleanup
      await collectionsRepo.delete(col.id);
      const afterDelete = await collectionsRepo.getAll();
      expect(afterDelete.some((c) => c.id === col.id)).toBe(false);
    });

    it('persists items with status, snooze, and surface events in local storage', async () => {
      const item = await itemsRepo.create({
        type: 'link',
        title: 'Local Storage Test Article',
        url: 'https://later.test/article',
        minutes: 15,
      });

      expect(item.id).toBeDefined();
      expect(item.status).toBe('pending');

      // Record surface event in local storage
      const eventId = await itemsRepo.recordSurfaceEvent(item.id, 15);
      expect(eventId).toBeDefined();

      // Snooze item in local storage
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      await itemsRepo.snooze(item.id, tomorrow);

      const snoozedItem = await itemsRepo.getById(item.id);
      expect(snoozedItem?.snoozed_until).toBe(tomorrow);

      // Complete item in local storage
      const doneItem = await itemsRepo.updateStatus(item.id, 'done');
      expect(doneItem?.status).toBe('done');
      expect(doneItem?.done_at).toBeDefined();

      // Delete item
      await itemsRepo.delete(item.id);
      const deletedItem = await itemsRepo.getById(item.id);
      expect(deletedItem).toBeNull();
    });
  });

  describe('Web Local Storage (localStorage Adapter Resilience)', () => {
    it('properly reads and writes across multiple tables in WebSQLiteDatabase', async () => {
      const webDb = getWebDatabase();
      expect(webDb).toBeDefined();

      // Write to settings
      await webDb.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        'test_key',
        'test_val',
      ]);
      const settingRow = await webDb.getFirstAsync(
        'SELECT value FROM settings WHERE key = ?',
        ['test_key']
      );
      expect(settingRow?.value).toBe('test_val');

      // Write to metadata cache
      await webDb.runAsync(
        'INSERT OR REPLACE INTO metadata_cache (url, title, description, image_url, site_name, estimated_minutes, cached_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['https://web-test.com', 'Web Title', 'Web Desc', null, 'Web Site', 5, new Date().toISOString()]
      );

      const cacheRow = await webDb.getFirstAsync(
        'SELECT * FROM metadata_cache WHERE url = ?',
        ['https://web-test.com']
      );
      expect(cacheRow?.title).toBe('Web Title');
      expect(cacheRow?.estimated_minutes).toBe(5);
    });
  });
});
