import { detectItemTypeFromUrl } from '../useListenShareIntent';
import { hapticFeedback } from '@/utils/haptics';

describe('Platform: Share Intent, Deep Linking & Haptics', () => {
  describe('Share Intent Detection', () => {
    it('detects reels from Instagram URLs', () => {
      expect(detectItemTypeFromUrl('https://www.instagram.com/reel/C8_1234567/')).toBe('reel');
      expect(detectItemTypeFromUrl('https://instagram.com/reel/abc')).toBe('reel');
    });

    it('detects reels from TikTok and YouTube Shorts URLs', () => {
      expect(detectItemTypeFromUrl('https://www.tiktok.com/@creator/video/12345')).toBe('reel');
      expect(detectItemTypeFromUrl('https://youtube.com/shorts/abcdef123')).toBe('reel');
    });

    it('detects regular articles/links', () => {
      expect(detectItemTypeFromUrl('https://nytimes.com/article/psychology-desks')).toBe('link');
      expect(detectItemTypeFromUrl('https://blog.samaltman.com/what-i-wish')).toBe('link');
    });
  });

  describe('Deep Linking URL Parsing (remind:// scheme)', () => {
    it('parses downtime widget trigger deep link (remind://today?minutes=15)', () => {
      const url = 'remind://today?minutes=15';
      const parsed = new URL(url);
      expect(parsed.protocol).toBe('remind:');
      expect(parsed.host).toBe('today');
      expect(parsed.searchParams.get('minutes')).toBe('15');
    });

    it('parses inbound share deep link (remind://add?url=...&title=...)', () => {
      const targetLink = 'https://paulgraham.com/lesson.html';
      const title = 'What You Wish Youd Known';
      const encoded = `remind://add?url=${encodeURIComponent(targetLink)}&title=${encodeURIComponent(title)}&minutes=15`;
      const parsed = new URL(encoded);

      expect(parsed.protocol).toBe('remind:');
      expect(parsed.host).toBe('add');
      expect(parsed.searchParams.get('url')).toBe(targetLink);
      expect(parsed.searchParams.get('title')).toBe(title);
      expect(parsed.searchParams.get('minutes')).toBe('15');
    });
  });

  describe('Safe Haptic Feedback Wrapper', () => {
    it('executes all haptic feedback methods without throwing in test environment', () => {
      expect(() => hapticFeedback.selection()).not.toThrow();
      expect(() => hapticFeedback.light()).not.toThrow();
      expect(() => hapticFeedback.medium()).not.toThrow();
      expect(() => hapticFeedback.success()).not.toThrow();
      expect(() => hapticFeedback.warning()).not.toThrow();
    });
  });
});

