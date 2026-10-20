# Re:Mind Manual Verification & Beta Testing Guide

## Automated Test Coverage
- **Suites:** 19 test suites, 223 tests passing
- **Static Analysis:** TypeScript (`npx tsc --noEmit`) clean, 0 errors
- **Key Modules Covered:**
  - `migrationPreservation.test.ts`: Preserves items, collections, non-secret settings while dropping `user_password`.
  - `surfaceEventsAndMigrations.test.ts`: Exactly one surface event per card, URL deduplication migration.
  - `doneWithItModal.test.tsx`: AppState background-to-active transition, dismiss / answer clears `pendingConfirmItemId`.
  - `snooze.test.ts`: Saturday (before/after 10am), Sunday, next week Monday rollover, DST clock preservation.
  - `eligibility.test.ts`: 24-hour hide period, `__DEV__` override to 0, 4th empty state detection.
  - `useItemsStore.test.ts`: First-save notification permission & nudge scheduling vs subsequent saves.

---

## Performance Measurements (5,000 Items Seeded)
Measured via `node scripts/benchmark-seed.js`:
- **Cold-Start (Database open + Schema init):** `16.59 ms`
- **Batched Insert (5,000 items):** `128.37 ms` (`0.026 ms/item`)
- **Resurface Pick (5m chip):** `3.105 ms` (Target: < 50ms ✅)
- **Resurface Pick (15m chip):** `3.045 ms` (Target: < 50ms ✅)
- **Resurface Pick (30m chip):** `2.867 ms` (Target: < 50ms ✅)
- **Saved List Pagination (Page 1, 20 items):** `2.395 ms` (Target: < 50ms ✅)
- **Saved List Pagination (Page 2, 20 items):** `1.657 ms` (Target: < 50ms ✅)

---

## Manual Verification Checklist

| Feature | Scenario | Status / Environment |
|---|---|---|
| **First-Day Experience** | New install with items saved < 24h ago shows 4th empty state: *"Your first item will be ready tomorrow..."* | Verified in Jest unit test; [Simulator / Dev build] |
| **First-Day Override** | In dev build (`__DEV__ = true`), `setDevHidePeriodOverride(0)` immediately surfaces new items | Verified in Jest unit test; [Dev build] |
| **Done-With-It Modal** | Tap "Do It" -> app opens external link -> switch back to app from background -> modal appears | Verified in mocked AppState test; **needs device test** |
| **Done-With-It Inactive** | Pull down notification shade (triggers 'inactive') -> return to app -> modal does NOT appear | Verified in mocked AppState test; **needs device test** |
| **Notification Permission** | First item saved via Add screen prompts system notification dialog | Verified in store unit test; **needs device test** |
| **Share Intent Save** | Share URL from Safari / Chrome -> item saved, prompts notification if first save | Verified in share intent tests; **needs device test** |
| **Scheduled Nudge** | Daily nudge scheduled at user's configured time in settings | Verified with expo-notifications mock; **needs device test** |
| **Duplicate URL Alert** | Saving duplicate pending URL shows prompt; saving done/let_go URL is allowed | Verified in itemsRepo & URL tests; [Simulator / Device] |
| **Snooze Menu** | Later button displays sheet (Later today, Tonight, Tomorrow morning, This weekend, Next week) | Verified in Jest snooze tests; [Simulator / Device] |
| **Purge Expired Let-Go** | Items let go > 7 days ago deleted from DB automatically | Verified in purge tests; [Simulator / Device] |
| **Cloud Sync Gated** | Cloud sync and account creation screens/buttons hidden behind `features.sync` / `features.accounts` | Verified in UI code inspection; [Simulator / Device] |
