/**
 * Re:Mind Downtime Widget Service
 * Manages deep links and widget state triggers for iOS WidgetKit and Android App Widgets.
 *
 * Supported Deep Link Triggers:
 * - remind://today?minutes=5   -> Opens 5-minute downtime resurfacing queue
 * - remind://today?minutes=15  -> Opens 15-minute downtime resurfacing queue
 * - remind://today?minutes=30  -> Opens 30-minute downtime resurfacing queue
 */

export interface WidgetDowntimeShortcut {
  minutes: 5 | 15 | 30;
  label: string;
  deepLink: string;
}

export const DOWNTIME_SHORTCUTS: WidgetDowntimeShortcut[] = [
  { minutes: 5, label: '5 Min Downtime', deepLink: 'remind://today?minutes=5' },
  { minutes: 15, label: '15 Min Downtime', deepLink: 'remind://today?minutes=15' },
  { minutes: 30, label: '30 Min Downtime', deepLink: 'remind://today?minutes=30' },
];

/**
 * Returns the deep link URI for a given downtime minute option.
 */
export function getWidgetDeepLink(minutes: 5 | 15 | 30): string {
  return `remind://today?minutes=${minutes}`;
}
