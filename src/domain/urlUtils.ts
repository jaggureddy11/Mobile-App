/**
 * Pure URL normalization utility for duplicate detection.
 * Standardizes URLs across share sheet and manual Add flows.
 */

const TRACKING_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'igshid',
  'gclid',
  'mc_eid',
  'si', // Spotify / YouTube share tracker
  'ref',
  'ref_src',
  'source',
  'feature',
]);

/**
 * Normalizes a URL by:
 * 1. Trimming whitespace
 * 2. Lowercasing protocol and host
 * 3. Stripping 'www.' prefix
 * 4. Stripping tracking query params (utm_*, fbclid, igshid, etc.)
 * 5. Stripping trailing slashes
 * 6. Ordering remaining query parameters consistently
 */
export function normalizeUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return '';

  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  try {
    // Ensure protocol exists for standard URL parser
    const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed);
    const urlString = hasProtocol ? trimmed : `https://${trimmed}`;
    const parsed = new URL(urlString);

    // Normalize protocol
    parsed.protocol = parsed.protocol.toLowerCase();

    // Normalize host (lowercase and strip leading 'www.')
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }
    parsed.hostname = host;

    // Filter out tracking query params
    const searchParams = new URLSearchParams(parsed.search);
    const cleanedParams = new URLSearchParams();

    // Sort keys for deterministic parameter ordering
    const sortedKeys = Array.from(searchParams.keys()).sort();
    for (const key of sortedKeys) {
      const lowerKey = key.toLowerCase();
      if (!TRACKING_QUERY_PARAMS.has(lowerKey) && !lowerKey.startsWith('utm_')) {
        for (const val of searchParams.getAll(key)) {
          cleanedParams.append(key, val);
        }
      }
    }

    const paramString = cleanedParams.toString();
    parsed.search = paramString ? `?${paramString}` : '';

    // Strip empty or trailing hash
    if (!parsed.hash || parsed.hash === '#') {
      parsed.hash = '';
    }

    // Build normalized string
    let result = parsed.toString();

    // Strip trailing slash if pathname is empty or ends with slash without query params
    if (result.endsWith('/')) {
      result = result.slice(0, -1);
    }

    return result;
  } catch {
    // Robust fallback for non-standard / malformed URLs
    let fallback = trimmed.toLowerCase();
    fallback = fallback.replace(/^https?:\/\//i, '');
    fallback = fallback.replace(/^www\./i, '');
    fallback = fallback.replace(/[?&](utm_[a-z]+|fbclid|igshid|gclid|si)=[^&#]*/gi, '');
    fallback = fallback.replace(/\?&/g, '?').replace(/&&/g, '&');
    fallback = fallback.replace(/[?&]$/, '');
    fallback = fallback.replace(/\/+$/, '');
    return fallback;
  }
}
