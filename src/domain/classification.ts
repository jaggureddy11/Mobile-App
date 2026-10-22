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
 * Cleans scraped titles by stripping noisy platform prefixes and suffixes.
 */
export function cleanScrapedTitle(rawTitle: string | undefined, url?: string): string | undefined {
  if (!rawTitle) return undefined;

  let title = rawTitle.trim();
  if (!title) return undefined;

  // Instagram share title format: "Username (@handle) on Instagram: "Caption...""
  const igMatch = title.match(/^[^\n:]+\s*\(@[^\)]+\)\s*on\s*Instagram:\s*["']?([^"'\n]+)/i);
  if (igMatch && igMatch[1]) {
    title = igMatch[1].trim();
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

  return title.trim() || rawTitle;
}
