import { detectItemTypeFromUrl } from '../useListenShareIntent';

describe('detectItemTypeFromUrl URL Pattern Suite', () => {
  // Test Instagram URLs (15 tests)
  describe('Instagram Reels and Links', () => {
    test.each([
      ['https://www.instagram.com/reel/C382x0aA1/', 'reel'],
      ['https://instagram.com/reel/xyz123', 'reel'],
      ['https://instagram.com/reel/DA12345/?igsh=MTc', 'reel'],
      ['https://m.instagram.com/reel/AbCdEfGhIjK', 'reel'],
      ['https://www.instagram.com/reels/audio/12345', 'link'],
      ['https://www.instagram.com/p/C_12345/', 'link'],
      ['https://instagram.com/stories/user/123456789', 'link'],
      ['http://instagram.com/reel/test', 'reel'],
      ['https://INSTAGRAM.COM/REEL/UPPERCASE', 'reel'],
      ['https://www.instagram.com/explore/tags/focus/', 'link'],
      ['https://instagram.com/direct/t/1234', 'link'],
      ['https://www.instagram.com/user_profile', 'link'],
      ['https://instagram.com/reels/', 'link'],
      ['https://www.instagram.com/reel/123?utm_source=ig_web_copy_link', 'reel'],
      ['https://instagram.com/tv/123456', 'link'],
    ])('should classify %s as %s', (url, expected) => {
      expect(detectItemTypeFromUrl(url)).toBe(expected);
    });
  });

  // Test TikTok URLs (15 tests)
  describe('TikTok Video Detection', () => {
    test.each([
      ['https://www.tiktok.com/@user/video/1234567890123456789', 'reel'],
      ['https://tiktok.com/@creator/video/987654321', 'reel'],
      ['https://vt.tiktok.com/ZS2xYZa12/', 'reel'],
      ['https://vm.tiktok.com/ZM8rX9Y/', 'reel'],
      ['https://m.tiktok.com/v/12345678.html', 'reel'],
      ['http://tiktok.com/@user/video/111', 'reel'],
      ['https://TIKTOK.COM/@DANCE/VIDEO/222', 'reel'],
      ['https://www.tiktok.com/discover/calm-reading', 'reel'],
      ['https://www.tiktok.com/t/ZT8rX9Y/', 'reel'],
      ['https://tiktok.com/music/original-sound-12345', 'reel'],
      ['https://www.tiktok.com/tag/meditation', 'reel'],
      ['https://tiktok.com/@profile', 'reel'],
      ['https://www.tiktok.com/@cook/video/333?is_from_webapp=1', 'reel'],
      ['https://vt.tiktok.com/unique_id/', 'reel'],
      ['https://vm.tiktok.com/short_hash', 'reel'],
    ])('should classify %s as %s', (url, expected) => {
      expect(detectItemTypeFromUrl(url)).toBe(expected);
    });
  });

  // Test YouTube Shorts and standard videos (15 tests)
  describe('YouTube Shorts and Standard Videos', () => {
    test.each([
      ['https://www.youtube.com/shorts/3XvQ8aP2-Y0', 'reel'],
      ['https://youtube.com/shorts/abcdef12345', 'reel'],
      ['https://m.youtube.com/shorts/xyz987', 'reel'],
      ['https://YOUTUBE.COM/SHORTS/CAPS123', 'reel'],
      ['https://youtube.com/shorts/vid1?feature=share', 'reel'],
      ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'link'],
      ['https://youtu.be/dQw4w9WgXcQ', 'link'],
      ['https://www.youtube.com/channel/UC123456789', 'link'],
      ['https://youtube.com/playlist?list=PL12345', 'link'],
      ['https://www.youtube.com/feed/subscriptions', 'link'],
      ['https://m.youtube.com/watch?v=12345', 'link'],
      ['https://youtu.be/shorts_not_here', 'link'],
      ['https://www.youtube.com/shorts/xyz?si=abc', 'reel'],
      ['https://youtube.com/shorts/55555', 'reel'],
      ['https://music.youtube.com/watch?v=123', 'link'],
    ])('should classify %s as %s', (url, expected) => {
      expect(detectItemTypeFromUrl(url)).toBe(expected);
    });
  });

  // Test General Articles and Content Links (20 tests)
  describe('General Web Article and News Links', () => {
    test.each([
      ['https://medium.com/@author/how-to-breathe-properly-12345', 'link'],
      ['https://substack.com/p/the-quiet-revolution', 'link'],
      ['https://news.ycombinator.com/item?id=12345', 'link'],
      ['https://github.com/jaggureddy11/Mobile-App', 'link'],
      ['https://developer.mozilla.org/en-US/docs/Web/API', 'link'],
      ['https://en.wikipedia.org/wiki/Mindfulness', 'link'],
      ['https://nytimes.com/2026/01/01/opinion/digital-calm.html', 'link'],
      ['https://theverge.com/2026/focus-tools-review', 'link'],
      ['https://zenhabits.net/breathe/', 'link'],
      ['https://paulgraham.com/lesson.html', 'link'],
      ['https://fs.blog/mental-models/', 'link'],
      ['https://stackoverflow.com/questions/123456', 'link'],
      ['https://reddit.com/r/productivity/', 'link'],
      ['https://twitter.com/naval/status/123456789', 'link'],
      ['https://x.com/levelsio/status/987654321', 'link'],
      ['https://wired.com/story/ambient-computing/', 'link'],
      ['https://arxiv.org/abs/2401.12345', 'link'],
      ['https://nature.com/articles/s41586-026-0001', 'link'],
      ['https://economist.com/special-report/2026', 'link'],
      ['https://bbc.com/news/technology-12345', 'link'],
    ])('should classify general web url %s as %s', (url, expected) => {
      expect(detectItemTypeFromUrl(url)).toBe(expected);
    });
  });
});
