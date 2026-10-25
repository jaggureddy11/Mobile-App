# Audit Report: Re:Mind (Mobile-App)

**Audit Date:** October 20, 2026  
**Auditor:** Senior React Native Engineer  
**Baseline Repository:** `Mobile-App` (`main` branch)  
**Spec References:** `/docs` ("Maybe Later" PRD, TRD, App Flow, Backend Schema, Implementation Plan)  
**Test Suite Baseline:** 176 passing tests, TypeScript clean (`npx tsc --noEmit`)

---

## 1. Audit Matrix (11 Core Criteria)

| # | Item | Status | Verification (File & Line) | Notes / Action Required |
|---|------|:------:|----------------------------|-------------------------|
| 1 | **"Do it" link/reel confirm flow**<br>Opens externally and on return prompts "Done with it?". Answering No leaves item waiting. | **FAIL** | [`app/(tabs)/today.tsx:66-79`](file:///Users/apple/Desktop/PROJECTS/Later%20app/app/%28tabs%29/today.tsx#L66-L79)<br>[`app/item/[id].tsx:72-80`](file:///Users/apple/Desktop/PROJECTS/Later%20app/app/item/%5Bid%5D.tsx#L72-L80) | `handleDoIt` currently opens the URL via `Linking.openURL` and immediately calls `await doItem(activeItem.id)`, marking the item done instantly without awaiting user return. There is no `AppState` listener or "Done with it?" prompt. |
| 2 | **"Later" Snooze Options**<br>Shows Tomorrow / This weekend (Sat 10:00 local) / Next week (Mon at nudge time), storing UTC in `snoozed_until`. | **FAIL** | [`app/(tabs)/today.tsx:81-84`](file:///Users/apple/Desktop/PROJECTS/Later%20app/app/%28tabs%29/today.tsx#L81-L84)<br>[`src/domain/useItemsStore.ts:100-108`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/domain/useItemsStore.ts#L100-L108)<br>[`src/db/database.ts:34-52`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/db/database.ts#L34-L52) | `laterItem` merely sets `resurfaced_at = new Date().toISOString()`. There is no snooze action sheet / modal offering Tomorrow, Saturday 10:00, or Monday nudge time, and the database schema lacks the `snoozed_until` column. |
| 3 | **Eligibility Criteria**<br>`status=waiting` AND not snoozed AND saved ≥ 24h ago. Fallback minutes: reel 1, text 1, link 5, task 15, activity 30. | **FAIL** | [`src/domain/resurface.ts:14-32`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/domain/resurface.ts#L14-L32)<br>[`src/domain/types.ts:60-66`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/domain/types.ts#L60-L66) | Resurface algorithm checks only `item.status === 'pending'`. It does not enforce the 24-hour waiting rule (`created_at <= Date.now() - 24 * 3600 * 1000`) and does not verify `snoozed_until`. Defaults exist in `types.ts` but are not enforced by pure domain logic if minutes is null/undefined. |
| 4 | **Pick Order & Surface Tracking**<br>Fits chip, `times_surfaced` ASC, `created_at` ASC. "Show something else" cycles queue. Surface event recorded. | **PARTIAL** | [`src/domain/resurface.ts:34-43`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/domain/resurface.ts#L34-L43)<br>[`app/(tabs)/today.tsx:142-148`](file:///Users/apple/Desktop/PROJECTS/Later%20app/app/%28tabs%29/today.tsx#L142-L148)<br>[`src/db/database.ts:34-52`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/db/database.ts#L34-L52) | Queue cycling and chip filtering are present, but sorting uses `resurfaced_at` rather than `times_surfaced` ASC. SQLite `items` table has no `times_surfaced` column and surface events are not recorded. |
| 5 | **Duplicate URL Detection**<br>Add screen & share intent reject existing URLs with "Already in your list" notice and no duplicate row. | **FAIL** | [`app/add.tsx:166-184`](file:///Users/apple/Desktop/PROJECTS/Later%20app/app/add.tsx#L166-L184)<br>[`src/platform/useListenShareIntent.ts:66-76`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/platform/useListenShareIntent.ts#L66-L76)<br>[`src/db/itemsRepo.ts:40-60`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/db/itemsRepo.ts#L40-L60) | Neither `add.tsx` nor `useListenShareIntent.ts` queries for existing URLs prior to insert. Duplicate URLs create duplicate rows with no warning or deduplication. |
| 6 | **"Let it go" Flow & Purge**<br>Animation + 5-second Undo; 30-day purge; done items protected. | **PASS** | [`app/(tabs)/today.tsx:86-89, 188-192`](file:///Users/apple/Desktop/PROJECTS/Later%20app/app/%28tabs%29/today.tsx#L86-L89)<br>[`src/domain/useItemsStore.ts:110-142`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/domain/useItemsStore.ts#L110-L142)<br>[`src/domain/purge.ts:1-25`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/domain/purge.ts#L1-L25)<br>[`src/__tests__/purgeExhaustive.test.ts`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/__tests__/purgeExhaustive.test.ts) | 5s Undo snackbar with progress bar and restore logic is fully working. `purgeExpiredLetGoItems` only removes items where `status = 'let_go'` older than 30 days. Done items are never purged. Verified by 40 automated tests. |
| 7 | **Share Intent Flow**<br>Cold/warm start, single transaction, "Saved for later" confirmation, 4s non-blocking scrape. | **PARTIAL** | [`src/platform/useListenShareIntent.ts:30-85`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/platform/useListenShareIntent.ts#L30-L85)<br>[`src/platform/metadataScraper.ts:25-33`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/platform/metadataScraper.ts#L25-L33) | `expo-share-intent` handles cold/warm start. Metadata scraper has 4s `AbortController` timeout and does not block saving. Missing: UI confirmation toast ("Saved for later") and execution in a single explicit SQLite transaction. |
| 8 | **Notifications Flow**<br>Permission requested after first save, quiet hours respected, tapping opens Today, denied banner in Settings. | **PARTIAL** | [`src/platform/notifications.ts:16-74`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/platform/notifications.ts#L16-L74)<br>[`src/domain/useItemsStore.ts:46`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/domain/useItemsStore.ts#L46)<br>[`app/(tabs)/settings.tsx:280-320`](file:///Users/apple/Desktop/PROJECTS/Later%20app/app/%28tabs%29/settings.tsx#L280-L320) | Daily/weekly triggers respect quiet hours and notifications route to Today. However, permission is requested during initial app store load rather than deferred until after the first successful save. Settings does not display a permission-denied warning banner if permissions are disabled. |
| 9 | **Security & Privacy**<br>No passwords stored anywhere. Clear sync destination. No user data sent remotely today. No item content in logs. | **FAIL** | [`src/db/settingsRepo.ts:33, 55`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/db/settingsRepo.ts#L33)<br>[`src/domain/types.ts:45`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/domain/types.ts#L45)<br>[`app/onboarding.tsx:210-240`](file:///Users/apple/Desktop/PROJECTS/Later%20app/app/onboarding.tsx#L210-L240)<br>[`src/platform/syncService.ts:46-59`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/platform/syncService.ts#L46-L59) | **Security Concern:** SQLite `settings` table has a `user_password` column that stores plaintext passwords entered during onboarding! No user data is sent remotely by default (`syncService` only connects if a custom HTTP endpoint is configured). No item content is logged. Password column must be removed in Step 2. |
| 10 | **Header Icons, Buttons & Toggles**<br>Every control performs a real action. Specific check on Heart / Activity icon. | **PARTIAL** | [`src/components/PageHeader.tsx:100-113`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/components/PageHeader.tsx#L100-L113)<br>[`app/(tabs)/saved.tsx:129`](file:///Users/apple/Desktop/PROJECTS/Later%20app/app/%28tabs%29/saved.tsx#L129) | All primary tab buttons, chips, and settings toggles are wired. However, `PageHeader.tsx` includes an Instagram-style Heart icon that opens an Activity modal of completed items. It does not exist in the PRD/spec and clutters the UI on Saved. |
| 11 | **Out-of-Spec Features Inventory**<br>Identify code not in spec with scope and impact. | **PARTIAL** | Listed in Section 2 below | Collections, tags, per-item reminder schedules, cloud sync, and onboarding account creation are implemented beyond the core spec. |

---

## 2. Inventory of Out-of-Spec Features

1. **User Accounts & Password Storage**
   - **Files:** [`app/onboarding.tsx`](file:///Users/apple/Desktop/PROJECTS/Later%20app/app/onboarding.tsx#L210-L240), [`src/db/settingsRepo.ts`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/db/settingsRepo.ts#L33), [`src/domain/types.ts`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/domain/types.ts#L45)
   - **Scope:** ~120 lines.
   - **Recommendation:** Purge `user_password` column completely. Hide email/password fields in onboarding behind `FEATURES.accounts` (default `false`).

2. **Cloud Sync Service & Settings Controls**
   - **Files:** [`src/platform/syncService.ts`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/platform/syncService.ts), [`app/(tabs)/settings.tsx`](file:///Users/apple/Desktop/PROJECTS/Later%20app/app/%28tabs%29/settings.tsx#L320-L380)
   - **Scope:** ~250 lines.
   - **Recommendation:** Keep code intact but hide sync UI and disable background sync behind `FEATURES.cloudSync` (default `false`). Replace "Offline + Online" badge with "Private on your device".

3. **Per-Item Reminder Schedules**
   - **Files:** [`app/add.tsx:179, 640-690`](file:///Users/apple/Desktop/PROJECTS/Later%20app/app/add.tsx#L640-L690), [`src/db/itemsRepo.ts:36-37`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/db/itemsRepo.ts#L36-L37)
   - **Scope:** ~100 lines.
   - **Recommendation:** Keep SQLite column untouched. Hide reminder schedule selector in Add screen to rely on the single global nudge.

4. **Collections System**
   - **Files:** [`src/db/collectionsRepo.ts`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/db/collectionsRepo.ts), [`src/domain/useCollectionsStore.ts`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/domain/useCollectionsStore.ts), [`app/(tabs)/saved.tsx:135-260`](file:///Users/apple/Desktop/PROJECTS/Later%20app/app/%28tabs%29/saved.tsx#L135-L260)
   - **Scope:** ~350 lines.
   - **Status:** Approved to KEEP for v1 beta per Step 2 instructions.

5. **Tagging System**
   - **Files:** [`app/add.tsx:150-153, 560-610`](file:///Users/apple/Desktop/PROJECTS/Later%20app/app/add.tsx#L560-L610), [`src/components/ListItem.tsx:85-95`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/components/ListItem.tsx#L85-L95)
   - **Scope:** ~150 lines.
   - **Status:** Approved to KEEP for v1 beta per Step 2 instructions.

6. **Activity / Heart Icon Header Button**
   - **Files:** [`src/components/PageHeader.tsx:100-113, 131-180`](file:///Users/apple/Desktop/PROJECTS/Later%20app/src/components/PageHeader.tsx#L100-L113)
   - **Scope:** ~80 lines.
   - **Recommendation:** Remove the Heart icon from headers.

---

## 3. Database Schema Changes Required for Step 3

To support Step 3 behavior fixes without data loss:
- **Migration 002:** Add `snoozed_until TEXT` and `times_surfaced INTEGER DEFAULT 0` to table `items`.
- **Migration 003:** Remove `user_password` from `settings` table (or purge value on load).
- All migrations must be additive and run inside non-destructive SQLite version checks.
