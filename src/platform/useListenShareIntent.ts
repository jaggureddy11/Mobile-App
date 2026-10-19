import { useEffect } from 'react';
import { useShareIntent } from 'expo-share-intent';
import { useItemsStore } from '../domain/useItemsStore';
import { ItemType, DEFAULT_ITEM_MINUTES } from '../domain/types';

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
 * (links, text, reels) when user shares into "Maybe Later"
 */
export function useListenShareIntent() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const addItem = useItemsStore((state) => state.addItem);

  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return;

    const rawText = shareIntent.text || '';
    const webUrl = shareIntent.webUrl || (rawText.startsWith('http') ? rawText : '');
    const title = shareIntent.meta?.title || (webUrl ? (shareIntent.meta?.title || rawText) : rawText);

    if (title || webUrl) {
      const type: ItemType = webUrl ? detectItemTypeFromUrl(webUrl) : 'text';
      const cleanTitle = title?.trim() || (type === 'reel' ? 'Shared Reel' : 'Shared Link');

      addItem({
        type,
        title: cleanTitle,
        url: webUrl || null,
        note: null,
        minutes: DEFAULT_ITEM_MINUTES[type],
      }).then(() => {
        resetShareIntent();
      }).catch((err) => {
        console.error('Failed to save shared intent:', err);
        resetShareIntent();
      });
    } else {
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent, addItem, resetShareIntent]);
}
