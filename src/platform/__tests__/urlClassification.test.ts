import { detectItemTypeFromUrl } from '../useListenShareIntent';
import {
  detectItemClassification,
  cleanScrapedTitle,
  cleanScrapedDescription,
  decodeHtmlEntities,
  extractHashtags,
  estimateReadTimeFromWordCount,
} from '@/domain/classification';

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

  describe('Smart Duration & Platform Classification', () => {
    test('YouTube standard videos suggest 15 minutes', () => {
      const res = detectItemClassification('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(res.type).toBe('link');
      expect(res.suggestedMinutes).toBe(15);
      expect(res.platform).toBe('YouTube');
    });

    test('Instagram Reels suggest 1 minute', () => {
      const res = detectItemClassification('https://www.instagram.com/reel/C382x0aA1/');
      expect(res.type).toBe('reel');
      expect(res.suggestedMinutes).toBe(1);
      expect(res.platform).toBe('Instagram Reel');
    });

    test('Podcasts suggest 30 minutes', () => {
      const res = detectItemClassification('https://open.spotify.com/episode/123456');
      expect(res.type).toBe('link');
      expect(res.suggestedMinutes).toBe(30);
      expect(res.platform).toBe('Spotify Podcast');
    });

    test('Substack & NYTimes suggest 15 minutes', () => {
      const res = detectItemClassification('https://myauthor.substack.com/p/deep-thoughts');
      expect(res.suggestedMinutes).toBe(15);
      expect(res.platform).toBe('Substack');
    });
  });

  describe('Read Time Estimation from Word Count', () => {
    test('short articles (<=300 words) -> 1m chip', () => {
      expect(estimateReadTimeFromWordCount(200)).toBe(1);
    });

    test('medium articles (301-1800 words) -> 5m chip', () => {
      expect(estimateReadTimeFromWordCount(1000)).toBe(5);
    });

    test('long articles (1801-4500 words) -> 15m chip', () => {
      expect(estimateReadTimeFromWordCount(3000)).toBe(15);
    });

    test('very long articles (>4500 words) -> 30m chip', () => {
      expect(estimateReadTimeFromWordCount(6000)).toBe(30);
    });
  });

  describe('Clean Scraped Titles', () => {
    test('cleans Instagram titles', () => {
      const raw = 'John Doe (@johndoe) on Instagram: "Morning routine for deep focus"';
      expect(cleanScrapedTitle(raw)).toBe('Morning routine for deep focus');
    });

    test('cleans Instagram titles with uppercase and hex entities', () => {
      const raw = 'SNEHA ON INSTAGRAM: "&#X939;&#X928;&#X941;&#X92E;&#X902;&#X924; साक्षात"';
      expect(cleanScrapedTitle(raw)).toBe('हनुमंत साक्षात');
    });

    test('cleans Instagram titles with emojis and hashtags', () => {
      const raw = 'SCREENPLAY.IN ON INSTAGRAM: "#GODOFWAR &#X1F525;&#X1F64F;&#X1F6D0;"';
      expect(cleanScrapedTitle(raw)).toBe('#GODOFWAR 🔥🙏🛐');
    });

    test('cleans YouTube title suffix', () => {
      const raw = 'Never Gonna Give You Up - YouTube';
      expect(cleanScrapedTitle(raw)).toBe('Never Gonna Give You Up');
    });

    test('cleans Medium title suffix', () => {
      const raw = 'The Art of Mindful Software | by Jane | Medium';
      expect(cleanScrapedTitle(raw)).toBe('The Art of Mindful Software');
    });
  });

  describe('HTML Entity Decoding', () => {
    test('decodes hexadecimal Unicode entities (emojis and scripts)', () => {
      expect(decodeHtmlEntities('&#x1F525; &amp; &#X939;&#X928;&#X941;&#X92E;&#X902;&#X924;')).toBe('🔥 & हनुमंत');
    });

    test('decodes decimal Unicode entities', () => {
      expect(decodeHtmlEntities('&#2361;&#2344;&#2369;&#2350;&#2306;&#2340;')).toBe('हनुमंत');
    });

    test('decodes common named entities', () => {
      expect(decodeHtmlEntities('&quot;Hello&quot; &amp; &lt;World&gt; &mdash; 2026')).toBe('"Hello" & <World> — 2026');
    });
  });

  describe('Clean Scraped Descriptions', () => {
    test('strips Instagram like counts, comment counts, author and date boilerplate', () => {
      const raw = '223K likes, 1,407 comments - sneh__verse27 on September 18, 2026: "&#x939;&#x928;&#x941;&#x92E;&#x902;&#x924; साक्षात"';
      expect(cleanScrapedDescription(raw)).toBe('हनुमंत साक्षात');
    });

    test('strips Instagram date prefix without likes count', () => {
      const raw = 'on October 25, 2026: "#GodOfWar &#x1f525;&#x1f64f;&#x1f6d0;"';
      expect(cleanScrapedDescription(raw)).toBe('#GodOfWar 🔥🙏🛐');
    });
  });

  describe('Extract Hashtags', () => {
    test('extracts clean hashtags as lowercase tag list', () => {
      const text = '#GodOfWar &#x1f525; #Focus #Dev and some text #godofwar';
      expect(extractHashtags(text)).toEqual(['godofwar', 'focus', 'dev']);
    });
  });
});
