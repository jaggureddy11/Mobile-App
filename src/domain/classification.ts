import { ItemType, MinuteOption } from './types';

export interface ItemClassification {
  type: ItemType;
  suggestedMinutes: MinuteOption;
  platform?: string;
}

/**
 * Maps word count to closest Re:Mind time chip option (1, 5, 15, 30 minutes).
 * Assumes average reading speed of ~200 words per minute.
 */
export function estimateReadTimeFromWordCount(wordCount: number): MinuteOption {
  if (wordCount <= 300) return 1;
  if (wordCount <= 1800) return 5;
  if (wordCount <= 4500) return 15;
  return 30;
}

/**
 * Intelligent URL classification engine.
 * Determines item type (reel, link), suggested duration chip, and platform name based on URL patterns.
 */
export function detectItemClassification(url: string): ItemClassification {
  if (!url || !url.trim()) {
    return { type: 'link', suggestedMinutes: 5 };
  }

  const lower = url.toLowerCase().trim();

  // 1. Short-Form Video / Reels (1 minute)
  if (
    /instagram\.com\/reel\/[a-zA-Z0-9_-]+/i.test(lower) ||
    /instagram\.com\/reels\/[a-zA-Z0-9_-]+/i.test(lower) && !lower.includes('/audio/') ||
    lower.includes('instagram.com/reel/') ||
    lower.includes('tiktok.com') ||
    lower.includes('vt.tiktok.com') ||
    lower.includes('vm.tiktok.com') ||
    lower.includes('youtube.com/shorts') ||
    lower.includes('snapchat.com/spotlight')
  ) {
    // Exclude non-video tabs like instagram.com/reels/ or /audio/
    if (lower.includes('instagram.com/reels/') && (lower.endsWith('/reels/') || lower.includes('/audio/'))) {
      return { type: 'link', suggestedMinutes: 5, platform: 'Instagram' };
    }

    let platform = 'Reel';
    if (lower.includes('instagram')) platform = 'Instagram Reel';
    else if (lower.includes('tiktok')) platform = 'TikTok';
    else if (lower.includes('youtube')) platform = 'YouTube Shorts';
    else if (lower.includes('snapchat')) platform = 'Snapchat';

    return { type: 'reel', suggestedMinutes: 1, platform };
  }

  // 2. Long-Form Video Platforms (15 minutes default)
  if (
    lower.includes('youtube.com/watch') ||
    lower.includes('youtu.be/') ||
    lower.includes('m.youtube.com/watch') ||
    lower.includes('vimeo.com') ||
    lower.includes('twitch.tv') ||
    lower.includes('ted.com/talks') ||
    lower.includes('dailymotion.com')
  ) {
    let platform = 'Video';
    if (lower.includes('youtube') || lower.includes('youtu.be')) platform = 'YouTube';
    else if (lower.includes('vimeo')) platform = 'Vimeo';
    else if (lower.includes('twitch')) platform = 'Twitch';
    else if (lower.includes('ted.com')) platform = 'TED Talk';

    return { type: 'link', suggestedMinutes: 15, platform };
  }

  // 3. Audio & Podcasts (30 minutes default)
  if (
    lower.includes('open.spotify.com/episode') ||
    lower.includes('podcasts.apple.com') ||
    lower.includes('pocketcasts.com') ||
    lower.includes('overcast.fm') ||
    lower.includes('soundcloud.com')
  ) {
    let platform = 'Podcast';
    if (lower.includes('spotify')) platform = 'Spotify Podcast';
    else if (lower.includes('apple')) platform = 'Apple Podcast';
    else if (lower.includes('soundcloud')) platform = 'SoundCloud';

    return { type: 'link', suggestedMinutes: 30, platform };
  }

  // 4. Substack & Deep Reading News (15 minutes default)
  if (
    lower.includes('substack.com') ||
    lower.includes('nytimes.com') ||
    lower.includes('theatlantic.com') ||
    lower.includes('newyorker.com') ||
    lower.includes('economist.com') ||
    lower.includes('foreignaffairs.com') ||
    lower.includes('wsj.com')
  ) {
    let platform = 'Deep Read';
    if (lower.includes('substack')) platform = 'Substack';
    else if (lower.includes('nytimes')) platform = 'NY Times';
    else if (lower.includes('theatlantic')) platform = 'The Atlantic';

    return { type: 'link', suggestedMinutes: 15, platform };
  }

  // 5. Short Reading & Web Articles (5 minutes default)
  if (
    lower.includes('medium.com') ||
    lower.includes('dev.to') ||
    lower.includes('hashnode.com') ||
    lower.includes('news.ycombinator.com') ||
    lower.includes('paulgraham.com') ||
    lower.includes('fs.blog') ||
    lower.includes('zenhabits.net') ||
    lower.includes('wikipedia.org') ||
    lower.includes('theverge.com') ||
    lower.includes('wired.com')
  ) {
    let platform = 'Article';
    if (lower.includes('medium')) platform = 'Medium';
    else if (lower.includes('ycombinator')) platform = 'Hacker News';
    else if (lower.includes('wikipedia')) platform = 'Wikipedia';

    return { type: 'link', suggestedMinutes: 5, platform };
  }

  // General web link
  return { type: 'link', suggestedMinutes: 5 };
}

/**
 * Fully decodes all HTML entities (named, decimal, and hexadecimal unicode code points).
 * Converts emoji hex entities like &#x1F525; -> 🔥 and script entities like &#X939; -> ह.
 */
export function decodeHtmlEntities(str: string | undefined): string {
  if (!str) return '';
  return str
    // 1. Hexadecimal numeric entities: &#x1F525; or &#X939;
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        const code = parseInt(hex, 16);
        if (!isNaN(code) && code > 0 && code <= 0x10ffff) {
          return String.fromCodePoint(code);
        }
        return '';
      } catch {
        return '';
      }
    })
    // 2. Decimal numeric entities: &#2361; or &#128293;
    .replace(/&#([0-9]+);/g, (_, dec) => {
      try {
        const code = parseInt(dec, 10);
        if (!isNaN(code) && code > 0 && code <= 0x10ffff) {
          return String.fromCodePoint(code);
        }
        return '';
      } catch {
        return '';
      }
    })
    // 3. Common named HTML entities
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&copy;/gi, '©')
    .replace(/&reg;/gi, '®')
    .replace(/&trade;/gi, '™')
    .trim();
}

/**
 * Cleans scraped titles by decoding entities and stripping noisy platform prefixes and suffixes.
 */
export function cleanScrapedTitle(rawTitle: string | undefined, url?: string): string | undefined {
  if (!rawTitle) return undefined;

  let title = decodeHtmlEntities(rawTitle).trim();
  if (!title) return undefined;

  // Instagram share title formats:
  // "SNEHA ON INSTAGRAM: "#GodOfWar 🔥...""
  // "Username (@handle) on Instagram: "Caption...""
  // "Username on Instagram: "Caption...""
  const igMatch = title.match(/^([^\n:]+?)(?:\s*\(@[^\)]+\))?\s*on\s*Instagram:\s*["']?([\s\S]+?)["']?$/i);
  if (igMatch) {
    const author = igMatch[1].trim();
    const caption = igMatch[2].trim().replace(/^["']|["']$/g, '').trim();
    if (caption && caption.length > 0) {
      title = caption;
    } else if (author) {
      title = `Reel by ${author}`;
    }
  }

  // TikTok formats: "Username on TikTok: Caption"
  const ttMatch = title.match(/^[^\n:]+\s*on\s*TikTok:\s*["']?([\s\S]+?)["']?$/i);
  if (ttMatch && ttMatch[1].trim()) {
    title = ttMatch[1].trim().replace(/^["']|["']$/g, '').trim();
  }

  // Twitter/X formats: "Username on X: "Tweet""
  const xMatch = title.match(/^[^\n:]+\s*on\s*(?:X|Twitter):\s*["']?([\s\S]+?)["']?$/i);
  if (xMatch && xMatch[1].trim()) {
    title = xMatch[1].trim().replace(/^["']|["']$/g, '').trim();
  }

  // Strip YouTube trailing suffix
  title = title.replace(/\s*-\s*YouTube$/i, '');

  // Strip Medium suffix
  title = title.replace(/\s*\|\s*by\s*[^\|]+\s*\|\s*Medium$/i, '');
  title = title.replace(/\s*\|\s*Medium$/i, '');

  // Strip Substack suffix
  title = title.replace(/\s*-\s*by\s*[^-\n]+\s*-\s*.*Substack.*$/i, '');
  title = title.replace(/\s*-\s*Substack$/i, '');

  // Strip generic site suffixes like " - SiteName"
  title = title.replace(/\s*[\|-]\s*(The Verge|Wired|TechCrunch|Hacker News)$/i, '');

  // Clean surrounding quotes if whole title is wrapped in quotes
  if ((title.startsWith('"') && title.endsWith('"')) || (title.startsWith("'") && title.endsWith("'"))) {
    title = title.slice(1, -1).trim();
  }

  return title.trim() || decodeHtmlEntities(rawTitle);
}

/**
 * Cleans scraped descriptions by decoding entities and removing social media metric boilerplate.
 * For Instagram: strips "223K likes, 1,407 comments - username on Date: "
 */
export function cleanScrapedDescription(rawDesc: string | undefined): string | undefined {
  if (!rawDesc) return undefined;

  let desc = decodeHtmlEntities(rawDesc).trim();
  if (!desc) return undefined;

  // Instagram description noise:
  // "223K likes, 1,407 comments - sneh__verse27 on September 18, 2026: "Caption...""
  // "on October 25, 2026: "#GodOfWar 🔥""
  // "1,234 likes, 56 comments - username: "Caption""
  desc = desc.replace(
    /^(?:[\d,.]+[KMkm]?\s+likes,\s+[\d,.]+[KMkm]?\s+comments\s*-\s*)?(?:[^\n:]+\s+on\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}:\s*|on\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}:\s*)["']?/i,
    ''
  );

  // Clean trailing quote left behind by stripped opening quote
  if (desc.endsWith('"') || desc.endsWith("'")) {
    if (!desc.startsWith('"') && !desc.startsWith("'")) {
      desc = desc.slice(0, -1).trim();
    }
  }

  // Clean surrounding quotes if whole description is wrapped in quotes
  if ((desc.startsWith('"') && desc.endsWith('"')) || (desc.startsWith("'") && desc.endsWith("'"))) {
    desc = desc.slice(1, -1).trim();
  }

  return desc || undefined;
}

/**
 * Extracts hashtags from title or caption text to suggest clean, sensible tags.
 * e.g. "#GodOfWar" -> "godofwar"
 */
export function extractHashtags(text: string | undefined): string[] {
  if (!text) return [];
  const decoded = decodeHtmlEntities(text);
  const matches = decoded.match(/#([a-zA-Z0-9_\u0900-\u097F]+)/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase()))).slice(0, 6);
}
