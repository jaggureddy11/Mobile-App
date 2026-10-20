/**
 * Feature Flags Configuration
 * Used to toggle features between v1 beta scope and future releases.
 * All non-v1 features default to false so code is preserved without active UI presence.
 */
export const FEATURES = {
  /**
   * User accounts and auth credentials in onboarding / profile.
   * When false: Onboarding is carousel -> choose nudge frequency -> Get Started.
   */
  accounts: false,

  /**
   * Cloud sync service and Settings sync section.
   * When false: Replaced with "Private on your device" local storage badge.
   */
  cloudSync: false,

  /**
   * Per-item reminder schedule (None/Daily/1 Day/2 Days/1 Month) in the Add screen.
   * When false: Relies on the single calm global daily/weekly nudge.
   */
  perItemReminders: false,
};
