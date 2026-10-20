export interface UrlMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Cleanly extracts OpenGraph / HTML metadata from any URL when online.
 * Times out after 4 seconds to never block or freeze the UI.
 */
export async function fetchUrlMetadata(rawUrl: string): Promise<UrlMetadata | null> {
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null;
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

    return {
      title,
      description,
      imageUrl,
      siteName,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
