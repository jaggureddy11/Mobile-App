import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useShareIntent } from 'expo-share-intent';
import { useItemsStore } from '../domain/useItemsStore';
import { ItemType, DEFAULT_ITEM_MINUTES } from '../domain/types';
import { itemsRepo } from '../db/itemsRepo';
import { getStartupMigrationError } from '../db/database';
import { fetchUrlMetadata } from './metadataScraper';
import { detectItemClassification, cleanScrapedTitle } from '../domain/classification';

export function detectItemTypeFromUrl(url: string): ItemType {
  return detectItemClassification(url).type;
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
      if (getStartupMigrationError()) {
        Alert.alert(
          'Database Unavailable',
          'Re:Mind encountered an issue preparing its database. Please open the app and tap Retry loading before saving items.'
        );
        resetShareIntent();
        return;
      }

      const rawText = shareIntent.text || '';
      const webUrl = shareIntent.webUrl || (rawText.startsWith('http') ? rawText : '');
      let title = shareIntent.meta?.title || (webUrl ? (shareIntent.meta?.title || rawText) : rawText);
      let imageUrl: string | undefined;
      let siteName: string | undefined;

      if (webUrl) {
        // 1. Check for duplicate normalized URL before anything else
        try {
          const existing = await itemsRepo.findByNormalizedUrl(webUrl);
          if (existing) {
            Alert.alert(
              'Already in your list',
              'This link is already saved in your list.'
            );
            resetShareIntent();
            return;
          }
        } catch (err) {
          console.warn('Error checking URL uniqueness:', err);
        }

        // 2. Attempt quick metadata scrape (times out gracefully after 4s)
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
        const classification = webUrl ? detectItemClassification(webUrl) : { type: 'text' as ItemType, suggestedMinutes: DEFAULT_ITEM_MINUTES['text'] };
        const type: ItemType = classification.type;
        const suggestedMinutes = classification.suggestedMinutes;

        const rawClean = cleanScrapedTitle(title, webUrl);
        const finalTitle = rawClean || title?.trim() || (type === 'reel' ? 'Shared Reel' : 'Shared Link');

        try {
          await addItem({
            type,
            title: finalTitle,
            url: webUrl || null,
            note: null,
            minutes: suggestedMinutes,
            image_url: imageUrl || null,
            site_name: siteName || (classification.platform || null),
          });

          Alert.alert(
            'Saved for later',
            `"${finalTitle}" was saved to your calm list.`
          );
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
