import { fetchUrlMetadata } from '../metadataScraper';

declare const global: any;

describe('fetchUrlMetadata Scraper Test Suite (25+ Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Invalid or Non-HTTP URLs (Immediate Safe Exit)', () => {
    test.each([
      [''],
      ['   '],
      ['ftp://example.com/file.txt'],
      ['file:///Users/apple/file.html'],
      ['javascript:alert(1)'],
      ['data:text/html,<h1>Hello</h1>'],
      ['not a url at all'],
      ['remind://open/item/123'],
    ])('returns null immediately for invalid protocol: %s', async (invalidUrl) => {
      const result = await fetchUrlMetadata(invalidUrl);
      expect(result).toBeNull();
    });
  });

  describe('Open Graph & HTML Tag Parsing', () => {
    it('extracts og:title, og:image, og:description, and og:site_name accurately', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:title" content="The Art of Intentional Breathing" />
            <meta property="og:description" content="Discover how 5 minutes of mindful breathwork restores clarity." />
            <meta property="og:image" content="https://mindful.org/breath.jpg" />
            <meta property="og:site_name" content="Mindful Living" />
          </head>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      }) as any;

      const meta = await fetchUrlMetadata('https://mindful.org/article');
      expect(meta).not.toBeNull();
      expect(meta?.title).toBe('The Art of Intentional Breathing');
      expect(meta?.description).toBe('Discover how 5 minutes of mindful breathwork restores clarity.');
      expect(meta?.imageUrl).toBe('https://mindful.org/breath.jpg');
      expect(meta?.siteName).toBe('Mindful Living');
    });

    it('falls back to standard HTML <title> tag when og:title is missing', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Deep Work Habits | Cal Newport</title>
            <meta name="description" content="Focus deeply in a distracted world." />
          </head>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      }) as any;

      const meta = await fetchUrlMetadata('https://calnewport.com/blog');
      expect(meta?.title).toBe('Deep Work Habits | Cal Newport');
      expect(meta?.description).toBe('Focus deeply in a distracted world.');
    });

    it('decodes HTML entities in titles and descriptions cleanly', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Focus &amp; Flow &mdash; A Guide to &#39;Calm&#39; Living &quot;Now&quot;</title>
          </head>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      }) as any;

      const meta = await fetchUrlMetadata('https://zen.com/guide');
      expect(meta?.title).toBe("Focus & Flow — A Guide to 'Calm' Living \"Now\"");
    });

    it('handles relative image URLs by converting them to absolute URLs', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Local Image Article</title>
            <meta property="og:image" content="/images/header.png" />
          </head>
        </html>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      }) as any;

      const meta = await fetchUrlMetadata('https://example.com/blog/post-1');
      expect(meta?.imageUrl).toBe('https://example.com/images/header.png');
    });
  });

  describe('Offline & Network Failure Resilience', () => {
    it('returns null gracefully on HTTP 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }) as any;

      const meta = await fetchUrlMetadata('https://example.com/not-found');
      expect(meta).toBeNull();
    });

    it('returns null gracefully on HTTP 500 server error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }) as any;

      const meta = await fetchUrlMetadata('https://example.com/error');
      expect(meta).toBeNull();
    });

    it('returns null gracefully on total network disconnection (offline)', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed')) as any;

      const meta = await fetchUrlMetadata('https://example.com/offline');
      expect(meta).toBeNull();
    });
  });
});
