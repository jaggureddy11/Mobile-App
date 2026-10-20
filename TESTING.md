# Re:Mind Manual Verification & Hardware Device Matrix

> **Notice**: All device entries must be verified on physical hardware or development builds; do not mark them passed without physical device testing.

---

## Behavior Spec Alignment
- **Later Sheet Snooze Options**: Exactly **3 options** matching spec:
  1. *Tomorrow* (Next day at user's configured nudge time)
  2. *This weekend* (Saturday at 10:00 AM local time)
  3. *Next week* (Monday at user's configured nudge time)
- **Purge Threshold**: Exactly **30 days** (`PURGE_THRESHOLD_DAYS = 30`, `src/domain/purge.ts`). Items with `status = 'let_go'` older than 30 days are automatically pruned from the SQLite database.

---

## Step 5 Full Device Test Matrix (Fill-In)

| Test Category | Test Case / Scenario | iOS Result | Android Result | Notes |
|---|---|---|---|---|
| **Share Intent (App Closed)** | Share Instagram reel with app closed | needs device test | needs device test | Native share sheet $\to$ app opens $\to$ item saved $\to$ type 'reel' (1m) |
| **Share Intent (App Closed)** | Share YouTube video with app closed | needs device test | needs device test | Native share sheet $\to$ app opens $\to$ item saved $\to$ type 'link' (5m) |
| **Share Intent (App Closed)** | Share Chrome/Safari article with app closed | needs device test | needs device test | Open Graph title & image extracted |
| **Share Intent (App Closed)** | Share WhatsApp plain text with app closed | needs device test | needs device test | Saves as text type (1m) |
| **Share Intent (App Closed)** | Share Notes plain text with app closed | needs device test | needs device test | Saves as text type (1m) |
| **Share Intent (App Open)** | Share Instagram reel while app is in background | needs device test | needs device test | Foreground transition handles intent smoothly |
| **Share Intent (App Open)** | Share YouTube video while app is in background | needs device test | needs device test | Metadata parsed, toast/card confirms save |
| **Share Intent (App Open)** | Share Chrome/Safari article while app in background | needs device test | needs device test | URL normalized; duplicate detected if exists |
| **Share Intent (App Open)** | Share WhatsApp text while app in background | needs device test | needs device test | Text item added to store immediately |
| **Share Intent (App Open)** | Share Notes text while app in background | needs device test | needs device test | Text item added to store immediately |
| **Duplicate Share** | Share identical URL that is already pending | needs device test | needs device test | Warns user item is already saved; no duplicate created |
| **Duplicate Allowed** | Share URL previously marked 'done' or 'let_go' | needs device test | needs device test | Re-saving allowed; creates new pending item |
| **Offline Share** | Share item in Airplane Mode | needs device test | needs device test | Saved locally without network crash; scraper handles offline |
| **Mid-Save Interruption** | Force kill app immediately during save | needs device test | needs device test | SQLite WAL transaction ensures DB integrity on reboot |
| **Notification Permission** | First save $\to$ permission granted | needs device test | needs device test | System dialog prompts; nudge scheduled at configured time |
| **Notification Permission** | First save $\to$ permission denied | needs device test | needs device test | Gracefully rejected; settings reflect disabled; app does not crash |
| **Nudge Reliability** | 3 consecutive days of daily nudges | needs device test | needs device test | Nudges fire reliably at user-configured time daily |
| **Quiet Hours** | Nudge scheduled during quiet hours window | needs device test | needs device test | Scheduled outside quiet hours boundary |
| **Notification Tap** | Tap notification banner when app closed/background | needs device test | needs device test | Routes directly to Today tab with active item surfaced |
| **Battery Optimization** | Android Doze / aggressive battery saver enabled | N/A | needs device test | AlarmManager / WorkManager schedule verified on Android |
| **Accessibility (Today)** | Dynamic Type / Large Font + ScreenReader (VoiceOver/TalkBack) | needs device test | needs device test | No clipped text; action buttons have accessible labels |
| **Accessibility (Add)** | Dynamic Type / Large Font + ScreenReader | needs device test | needs device test | Input fields and category pills navigable |
| **Accessibility (Saved)** | Dynamic Type / Large Font + ScreenReader | needs device test | needs device test | FlatList items and filter chips read clearly |
| **Upgrade-Install** | Install new build over previous build with real SQLite data | needs device test | needs device test | Migrations run cleanly; all items, collections, settings intact |
