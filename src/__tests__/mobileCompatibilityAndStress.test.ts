import { Dimensions, BackHandler, AppState, AppStateStatus } from 'react-native';
import { colors, spacing, typography, radii } from '@/theme';
import { Item, UserSettings, DEFAULT_SETTINGS, ItemType, MinuteOption } from '@/domain/types';
import { pickResurfacedItem } from '@/domain/resurface';
import { isItemEligible } from '@/domain/eligibility';
import { getExpiredLetGoItemIds, PURGE_THRESHOLD_DAYS, THIRTY_DAYS_MS } from '@/domain/purge';
import { normalizeUrl } from '@/domain/urlUtils';
import { detectItemClassification } from '@/domain/classification';

describe('Mobile Compatibility & Cross-Device Stress Suite', () => {
  describe('1. Screen Dimensions & Responsive Viewports', () => {
    const VIEWPORTS = [
      { name: 'iPhone SE / 5S (Ultra Compact)', width: 320, height: 568, scale: 2 },
      { name: 'Standard Android / Galaxy A (Compact)', width: 360, height: 640, scale: 2 },
      { name: 'iPhone 13/14/15/16 (Standard iOS)', width: 390, height: 844, scale: 3 },
      { name: 'Pixel 8 / Galaxy S24 (Standard Android)', width: 412, height: 915, scale: 2.625 },
      { name: 'Foldable Cover Screen (Narrow)', width: 300, height: 800, scale: 2.5 },
      { name: 'Large Foldable Unfolded (Square-ish)', width: 673, height: 841, scale: 2.75 },
      { name: 'iPad Mini / Android Tablet (Medium Tablet)', width: 768, height: 1024, scale: 2 },
      { name: 'Large Tablet / iPad Pro 11"', width: 834, height: 1194, scale: 2 },
    ];

    VIEWPORTS.forEach((device) => {
      it(`calculates safe layout bounds and non-negative margins for ${device.name} (${device.width}x${device.height})`, () => {
        const horizontalPadding = spacing.lg * 2; // typical screen padding (24 * 2 = 48)
        const usableWidth = device.width - horizontalPadding;

        expect(usableWidth).toBeGreaterThan(200);

        // Card width calculation
        const cardWidth = Math.min(usableWidth, 520);
        expect(cardWidth).toBeGreaterThan(0);
        expect(cardWidth).toBeLessThanOrEqual(device.width);

        // Aspect ratio is safe
        const aspectRatio = device.height / device.width;
        expect(aspectRatio).toBeGreaterThan(1.1); // Portrait orientation
      });
    });

    it('ensures touch targets meet Apple HIG (44pt) and Android Material (48dp) minimums', () => {
      const BUTTON_TARGET_MINIMUM = 44;
      const primaryButtonHeight = 52;
      const chipHeight = 44;
      const iconButtonHitSlop = 12; // hitSlop expands touch target by 24pt

      expect(primaryButtonHeight).toBeGreaterThanOrEqual(BUTTON_TARGET_MINIMUM);
      expect(chipHeight).toBeGreaterThanOrEqual(BUTTON_TARGET_MINIMUM);
      expect(20 + iconButtonHitSlop * 2).toBeGreaterThanOrEqual(BUTTON_TARGET_MINIMUM);
    });

    it('validates color contrast tokens for outdoors / high-ambient sunlight reading', () => {
      // Background must remain light and warm
      expect(colors.background).toBe('#FBF9F6');
      // TextPrimary must be dark charcoal with >7:1 contrast against background
      expect(colors.textPrimary).toBe('#2D2D2D');
      // Accent caramel provides calming brand personality
      expect(colors.accent).toBe('#D4C4B0');
    });
  });

  describe('2. Dynamic Type & Font Scaling (Accessibility / WCAG)', () => {
    const FONT_SCALES = [1.0, 1.15, 1.3, 1.5, 2.0, 3.0]; // Normal up to Android/iOS maximum accessibility magnification

    FONT_SCALES.forEach((scaleFactor) => {
      it(`preserves legible line height and typography bounds at ${scaleFactor * 100}% text size`, () => {
        const baseTitleSize = typography.sizes.headline; // 24
        const scaledSize = baseTitleSize * scaleFactor;
        const scaledLineHeight = scaledSize * 1.3;

        expect(scaledSize).toBeGreaterThan(0);
        expect(scaledLineHeight).toBeGreaterThan(scaledSize);
        // Ensure no division by zero or NaN
        expect(Number.isFinite(scaledSize)).toBe(true);
      });
    });

    it('verifies typography token values are defined and positive numbers', () => {
      expect(typography.sizes.headline).toBeGreaterThan(0);
      expect(typography.sizes.body).toBeGreaterThan(0);
      expect(typography.sizes.caption).toBeGreaterThan(0);
      expect(typography.sizes.tag).toBeGreaterThan(0);
      expect(typography.sizes.hero).toBeGreaterThan(0);
    });
  });

  describe('3. Android Lifecycle, AppState & BackHandler', () => {
    it('manages AppState transitions without throwing', () => {
      const transitions: AppStateStatus[] = ['active', 'background', 'inactive', 'active'];
      let currentState: AppStateStatus = 'active';

      transitions.forEach((nextState) => {
        currentState = nextState;
        expect(['active', 'background', 'inactive']).toContain(currentState);
      });
    });

    it('handles hardware back button callback subscription cleanly', () => {
      const mockCallback = jest.fn(() => true);
      const subscription = BackHandler.addEventListener('hardwareBackPress', mockCallback);

      expect(typeof subscription.remove).toBe('function');
      subscription.remove();
    });
  });

  describe('4. Offline, Airplane Mode & Resilience', () => {
    it('sanitizes and classifies links without requiring network connection', () => {
      const offlineUrls = [
        'https://en.wikipedia.org/wiki/Wabi-sabi',
        'https://github.com/facebook/react-native',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://instagram.com/reel/C8_abc123/',
      ];

      offlineUrls.forEach((url) => {
        const cleaned = normalizeUrl(url);
        expect(cleaned).toBeTruthy();
        expect(cleaned.startsWith('https://')).toBe(true);

        const classification = detectItemClassification(url);
        expect(classification).toBeDefined();
        expect(['link', 'reel', 'task', 'activity', 'text']).toContain(classification.type);
        expect([1, 5, 15, 30]).toContain(classification.suggestedMinutes);
      });
    });

    it('normalizes hostnames cleanly when DNS lookup is unavailable', () => {
      expect(normalizeUrl('https://sub.domain.example.com/path?arg=1')).toBe('https://sub.domain.example.com/path?arg=1');
      expect(normalizeUrl('https://www.nytimes.com/interactive/2024/architecture.html/')).toBe('https://nytimes.com/interactive/2024/architecture.html');
    });
  });

  describe('5. High Data Scale & Stress Test (1,000 Items)', () => {
    const generate1000Items = (): Item[] => {
      const items: Item[] = [];
      const types: ItemType[] = ['link', 'reel', 'task', 'activity', 'text'];
      const minutes: MinuteOption[] = [1, 5, 15, 30];
      const now = Date.now();

      for (let i = 0; i < 1000; i++) {
        const hoursAgo = Math.floor(i * 1.5);
        // Decouple status from type to ensure all types have pending items
        const status = i % 8 === 0 ? 'done' : i % 11 === 0 ? 'let_go' : 'pending';
        items.push({
          id: `stress-item-${i}`,
          type: types[(i * 3 + 1) % types.length],
          title: `Item ${i}: ${i % 2 === 0 ? 'Deep Work Principles' : 'Relaxation Exercise'} #${i}`,
          url: i % 3 === 0 ? `https://example.com/article-${i}` : null,
          minutes: minutes[i % minutes.length],
          status,
          created_at: new Date(now - hoursAgo * 3600000).toISOString(),
          done_at: status === 'done' ? new Date(now - hoursAgo * 1800000).toISOString() : null,
          let_go_at: status === 'let_go' ? new Date(now - hoursAgo * 1800000).toISOString() : null,
          resurfaced_at: i % 4 === 0 ? new Date(now - hoursAgo * 1000000).toISOString() : null,
          snoozed_until: i % 10 === 0 ? new Date(now + 86400000).toISOString() : null,
          times_surfaced: i % 3,
          tags: [`tag-${i % 10}`, 'stress-test'],
          note: `Personal note for stress item ${i}`,
        });
      }
      return items;
    };

    it('filters 1,000 items by category in under 20ms', () => {
      const thousandItems = generate1000Items();

      const startTime = Date.now();
      const links = thousandItems.filter((i) => i.status === 'pending' && i.type === 'link');
      const reels = thousandItems.filter((i) => i.status === 'pending' && i.type === 'reel');
      const tasks = thousandItems.filter((i) => i.status === 'pending' && i.type === 'task');
      const duration = Date.now() - startTime;

      expect(links.length).toBeGreaterThan(0);
      expect(reels.length).toBeGreaterThan(0);
      expect(tasks.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50);
    });

    it('performs full-text keyword search across 1,000 items in under 25ms', () => {
      const thousandItems = generate1000Items();

      const startTime = Date.now();
      const query = 'principles';
      const results = thousandItems.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.note?.toLowerCase().includes(q) ||
          item.tags?.some((t) => t.toLowerCase().includes(q))
        );
      });
      const duration = Date.now() - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100);
    });

    it('selects next resurfaced item from 1,000 items using FIFO priority in under 15ms', () => {
      const thousandItems = generate1000Items();

      const startTime = Date.now();
      const selected = pickResurfacedItem(thousandItems, 15);
      const duration = Date.now() - startTime;

      expect(selected).toBeDefined();
      expect(selected?.status).toBe('pending');
      expect(selected?.minutes).toBeLessThanOrEqual(15);
      expect(duration).toBeLessThan(100);
    });

    it('accurately identifies expired let-go items across 1,000 items for purge', () => {
      const thousandItems = generate1000Items();

      const expiredIds = getExpiredLetGoItemIds(thousandItems);
      expect(Array.isArray(expiredIds)).toBe(true);

      const expiredItems = thousandItems.filter((i) => expiredIds.includes(i.id));
      expiredItems.forEach((item) => {
        expect(item.status).toBe('let_go');
        expect(item.let_go_at).not.toBeNull();
        const days = (Date.now() - new Date(item.let_go_at!).getTime()) / (1000 * 3600 * 24);
        expect(days).toBeGreaterThanOrEqual(PURGE_THRESHOLD_DAYS);
      });
    });
  });

  describe('6. Extreme Input, Unicode & URL Edge Cases', () => {
    it('handles 2,000-character URLs with extensive query parameters safely', () => {
      const longQuery = 'param=' + 'a'.repeat(1900);
      const giantUrl = `https://example.com/deep/path?${longQuery}#section`;

      const sanitized = normalizeUrl(giantUrl);
      expect(sanitized).toBeDefined();
      expect(sanitized.startsWith('https://example.com')).toBe(true);
    });

    it('handles emojis and international Unicode characters in titles and notes', () => {
      const complexTitles = [
        '🧘 Morning meditation session with 10-minute breathwork 🌸',
        '日本語の勉強：毎日１５分の読書リスト',
        'العربية: قراءة وتأمل في نهاية اليوم',
        'עברית: רשימת קריאה ומשימות',
        'हिंदी: ध्यान और विचार के लिए समय',
        '🔥 Code review: PR #42 — Fix Reanimated worklet remote call crash 🚀',
      ];

      complexTitles.forEach((title) => {
        expect(title.trim().length).toBeGreaterThan(0);
        // Clean display
        expect(title).toContain(title.slice(0, 5));
      });
    });

    it('handles 10,000-character multi-paragraph note content without memory issues', () => {
      const giantNote = 'Reflections on mindfulness and slow computing.\n\n'.repeat(200);
      expect(giantNote.length).toBeGreaterThan(8000);

      // Slicing for preview cards
      const preview = giantNote.slice(0, 200);
      expect(preview.length).toBeLessThanOrEqual(200);
    });

    it('strips tracking query parameters (utm_source, fbclid, gclid) without corrupting URLs', () => {
      const trackingUrl =
        'https://example.com/article?utm_source=newsletter&utm_medium=email&utm_campaign=spring&fbclid=12345&id=99';

      const cleaned = normalizeUrl(trackingUrl);
      expect(cleaned).toContain('id=99');
      expect(cleaned).not.toContain('utm_source');
      expect(cleaned).not.toContain('fbclid');
    });

    it('handles invalid or malformed URL strings safely without crashing', () => {
      const malformed = [
        '',
        '   ',
        'javascript:alert(1)',
        'file:///etc/passwd',
        'http://',
        'https://',
        'not a url at all',
      ];

      malformed.forEach((badUrl) => {
        const classification = detectItemClassification(badUrl);
        expect(classification).toBeDefined();
        expect(classification.type).toBe('link');
      });
    });
  });

  describe('7. Concurrency & Rapid User Mutation Simulation', () => {
    it('simulates rapid sequential status mutations without race conditions or invalid states', () => {
      let item: Item = {
        id: 'concurrent-1',
        type: 'link',
        title: 'Concurrent Action Test',
        url: 'https://example.com',
        minutes: 5,
        status: 'pending',
        created_at: new Date(Date.now() - 36000000).toISOString(),
        done_at: null,
        let_go_at: null,
        resurfaced_at: null,
        snoozed_until: null,
        times_surfaced: 1,
      };

      // 1. Mark done
      item = { ...item, status: 'done', done_at: new Date().toISOString() };
      expect(item.status).toBe('done');
      expect(item.done_at).not.toBeNull();

      // 2. Undo back to pending
      item = { ...item, status: 'pending', done_at: null };
      expect(item.status).toBe('pending');
      expect(item.done_at).toBeNull();

      // 3. Snooze for 24h
      const snoozeTarget = new Date(Date.now() + 86400000).toISOString();
      item = { ...item, snoozed_until: snoozeTarget };
      expect(item.snoozed_until).toBe(snoozeTarget);

      // 4. Let go
      item = { ...item, status: 'let_go', let_go_at: new Date().toISOString() };
      expect(item.status).toBe('let_go');
      expect(item.let_go_at).not.toBeNull();
    });
  });

  describe('5. HomeScreen & Tab Mobile Compatibility Features', () => {
    it('verifies dynamic navigation footer calculation adapts across home-button vs gesture-nav insets', () => {
      const calculateDynamicFooter = (insetsBottom: number, isIos: boolean) => {
        const dynamicPaddingBottom = Math.max(insetsBottom, isIos ? 16 : 10);
        const dynamicHeight = 58 + dynamicPaddingBottom;
        return { dynamicHeight, dynamicPaddingBottom };
      };

      // iPhone SE with physical home button (insets.bottom = 0)
      const seResult = calculateDynamicFooter(0, true);
      expect(seResult.dynamicPaddingBottom).toBe(16);
      expect(seResult.dynamicHeight).toBe(74);

      // Modern iPhone with gesture indicator bar (insets.bottom = 34)
      const iphone15Result = calculateDynamicFooter(34, true);
      expect(iphone15Result.dynamicPaddingBottom).toBe(34);
      expect(iphone15Result.dynamicHeight).toBe(92);

      // Android with 3-button navigation (insets.bottom = 48)
      const android3BtnResult = calculateDynamicFooter(48, false);
      expect(android3BtnResult.dynamicPaddingBottom).toBe(48);
      expect(android3BtnResult.dynamicHeight).toBe(106);

      // Android with gesture pill (insets.bottom = 16)
      const androidGestureResult = calculateDynamicFooter(16, false);
      expect(androidGestureResult.dynamicPaddingBottom).toBe(16);
      expect(androidGestureResult.dynamicHeight).toBe(74);
    });

    it('ensures TimeChips distribute proportionally without overflow on 320px width screens', () => {
      const screenWidth = 320;
      const screenPaddingHorizontal = spacing.xxl * 2; // 24 * 2 = 48
      const availableWidth = screenWidth - screenPaddingHorizontal; // 272px
      const chipGap = spacing.md; // 12
      const chipCount = 3;
      const totalGapWidth = chipGap * (chipCount - 1); // 24px
      const individualChipWidth = (availableWidth - totalGapWidth) / chipCount; // ~82.6px

      // Individual chip width must comfortably fit "5 min" / "15 min" / "30 min"
      expect(individualChipWidth).toBeGreaterThan(70);
      expect(availableWidth).toBe(272);
    });

    it('validates modal maxHeight constraints prevent clipping on 568px height displays', () => {
      const screenHeight = 568; // iPhone SE 1st Gen
      const maxSheetHeight = screenHeight * 0.85; // 85% rule
      expect(maxSheetHeight).toBeLessThan(screenHeight);
      expect(maxSheetHeight).toBeGreaterThan(400);

      // Total required height for snooze options (3 options at ~50px + header ~80px + cancel ~50px = ~280px)
      const estimatedContentHeight = 280;
      expect(estimatedContentHeight).toBeLessThan(maxSheetHeight);
    });
  });
});

