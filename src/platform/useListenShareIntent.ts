import { useEffect } from 'react';
import { useShareIntent } from 'expo-share-intent';
import { useItemsStore } from '../domain/useItemsStore';
import { ItemType, DEFAULT_ITEM_MINUTES } from '../domain/types';
import { fetchUrlMetadata } from './metadataScraper';

export function detectItemTypeFromUrl(url: string): ItemType {
  const lower = url.toLowerCase();
  if (
    lower.includes('instagram.com/reel') ||
    lower.includes('tiktok.com') ||
    lower.includes('youtube.com/shorts')
  ) {
    return 'reel';
  }
  return 'link';
}

/**
 * Hook to listen for inbound shares from system Share Sheet
 * (links, text, reels) when user shares into "Re:Mind"
 */
export function useListenShareIntent() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const addItem = useItemsStore((state) => state.addItem);

  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return;

    let isMounted = true;
    const processShare = async () => {
      const rawText = shareIntent.text || '';
      const webUrl = shareIntent.webUrl || (rawText.startsWith('http') ? rawText : '');
      let title = shareIntent.meta?.title || (webUrl ? (shareIntent.meta?.title || rawText) : rawText);
      let imageUrl: string | undefined;
      let siteName: string | undefined;

      if (webUrl) {
        // Attempt quick metadata scrape (times out gracefully after 4s)
        try {
          const meta = await fetchUrlMetadata(webUrl);
          if (meta) {
            if (meta.title && (!title || title === webUrl)) {
              title = meta.title;
            }
            imageUrl = meta.imageUrl;
            siteName = meta.siteName;
          }
        } catch {
          // Keep offline resilience
        }
      }

      if (!isMounted) return;

      if (title || webUrl) {
        const type: ItemType = webUrl ? detectItemTypeFromUrl(webUrl) : 'text';
        const cleanTitle = title?.trim() || (type === 'reel' ? 'Shared Reel' : 'Shared Link');

        try {
          await addItem({
            type,
            title: cleanTitle,
            url: webUrl || null,
            note: null,
            minutes: DEFAULT_ITEM_MINUTES[type],
            image_url: imageUrl || null,
            site_name: siteName || null,
          });
        } catch (err) {
          console.error('Failed to save shared intent:', err);
        } finally {
          resetShareIntent();
        }
      } else {
        resetShareIntent();
      }
    };

    processShare();

    return () => {
      isMounted = false;
    };
  }, [hasShareIntent, shareIntent, addItem, resetShareIntent]);
}
