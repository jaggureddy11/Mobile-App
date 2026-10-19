import { detectItemTypeFromUrl } from '../useListenShareIntent';

describe('Platform: Share Intent detection', () => {
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
