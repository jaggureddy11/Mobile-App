import { MinuteOption } from '../domain/types';
import {
  cleanScrapedTitle,
  cleanScrapedDescription,
  decodeHtmlEntities,
  extractHashtags,
  estimateReadTimeFromWordCount,
} from '../domain/classification';
import { metadataCacheRepo } from '../db/metadataCacheRepo';

export interface UrlMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  estimatedMinutes?: MinuteOption;
  suggestedTags?: string[];
}

export interface FetchMetadataOptions {
  bypassCache?: boolean;
}

/**
 * Extracts OpenGraph / HTML metadata with local storage caching.
 * 1. Checks persistent local storage cache for instantaneous offline/online recall.
 * 2. Fetches online with 4-second timeout to never block UI.
 * 3. Persists successful metadata into local storage cache.
 */
export async function fetchUrlMetadata(
  rawUrl: string,
  options?: FetchMetadataOptions
): Promise<UrlMetadata | null> {
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null;
  }

  // 1. Check local storage cache first
  if (!options?.bypassCache) {
    try {
      const cached = await metadataCacheRepo.get(trimmed);
      if (cached) {
        return cached;
      }
    } catch {}
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(trimmed, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // 1. Title extraction
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = ogTitleMatch ? decodeHtmlEntities(ogTitleMatch[1]) : titleTagMatch ? decodeHtmlEntities(titleTagMatch[1]) : undefined;

    // 2. Image extraction
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    let imageUrl = ogImageMatch ? ogImageMatch[1].trim() : undefined;
    if (imageUrl) {
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      } else if (imageUrl.startsWith('/')) {
        try {
          const origin = new URL(trimmed).origin;
          imageUrl = origin + imageUrl;
        } catch {}
      }
    }

    // 3. Description extraction
    const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const description = ogDescMatch ? decodeHtmlEntities(ogDescMatch[1]) : undefined;

    // 4. Site name
    const ogSiteMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
    let siteName = ogSiteMatch ? decodeHtmlEntities(ogSiteMatch[1]) : undefined;
    if (!siteName) {
      try {
        const parsed = new URL(trimmed);
        siteName = parsed.hostname.replace(/^www\./, '');
      } catch {}
    }

    // 5. Estimated read time from paragraph text word count
    let estimatedMinutes: MinuteOption | undefined = undefined;
    const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (paragraphs && paragraphs.length > 0) {
      const allText = paragraphs
        .map((p) => p.replace(/<[^>]+>/g, ' '))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      const words = allText.split(/\s+/).filter((w) => w.length > 0);
      if (words.length > 50) {
        estimatedMinutes = estimateReadTimeFromWordCount(words.length);
      }
    }

    const cleanedTitle = cleanScrapedTitle(title, trimmed);
    const cleanedDescription = cleanScrapedDescription(description);
    const suggestedTags = extractHashtags(`${title || ''} ${description || ''}`);

    const result: UrlMetadata = {
      title: cleanedTitle || title,
      description: cleanedDescription || description,
      imageUrl,
      siteName,
      estimatedMinutes,
      suggestedTags: suggestedTags.length > 0 ? suggestedTags : undefined,
    };

    // Save to local storage cache if any meaningful metadata was found
    if (result.title || result.description || result.imageUrl) {
      metadataCacheRepo.set(trimmed, result).catch(() => {});
    }

    return result;
  } catch {
    clearTimeout(timeoutId);
    // Offline resilience: if network failed but previously cached within 30 days, return cached
    try {
      const offlineFallback = await metadataCacheRepo.get(trimmed, 30);
      if (offlineFallback) {
        return offlineFallback;
      }
    } catch {}
    return null;
  }
}
