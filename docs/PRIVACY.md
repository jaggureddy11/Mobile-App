# Re:Mind — Privacy Policy

*Last updated: October 2026*

Re:Mind is built on a simple foundation: **your saved items, notes, and habits belong to you, and stay on your device.** We do not run a server, we do not have user accounts, and we collect zero data about you.

---

### 1. No Data is Sent to the Developer
- **Zero telemetry & zero tracking:** We do not collect, transmit, store, or sell any data about you or your use of the app. The developer never receives your saved items, notes, URLs, usage habits, device identifiers, or IP address.
- **No analytics or tracking SDKs:** The app contains no third-party tracking or analytics SDKs (such as Google Analytics, Firebase, Amplitude, or Mixpanel).
- **No silent crash reporters:** The app contains no third-party crash reporting software (such as Sentry or Bugsnag) transmitting diagnostic data in the background.

### 2. Everything Stays on Your Device
- All your saved items, notes, tags, categories, surface events, and settings are saved exclusively in a local database stored inside your device's private sandbox storage (`maybe_later.db`).
- If you delete the app or clear its data, all stored items are permanently erased from your device.

### 3. Link Previews Connect Directly to the Saved Site
- When you save or share a web link into Re:Mind, your device makes a direct network request (`GET`) to that specific website to fetch its public title, site name, and preview image—exactly as if you opened that website in your web browser.
- These requests go straight from your device to the target website. No intermediary servers, proxies, or developer services are involved.

### 4. Debug Logs Are Shared Only If You Tap "Copy debug info"
- If an unexpected error occurs while running the app, a sanitized error record is kept in a local log on your device (capped at the last 50 entries).
- **Strict privacy protection:** The log records only the technical error type (e.g. `TypeError`, `DiskError`), the current screen name, and a timestamp. It is mathematically and programmatically prohibited from recording raw error messages, URLs, notes, item titles, or personal content.
- This log is never sent anywhere automatically. It is shared only if you deliberately open **Settings** and tap **"Copy debug info"** to paste it into an email or support message.

### 5. No Accounts, Passwords, or Logins
- Re:Mind requires no email, password, social login, or telephone number. You use the entire app anonymously from day one.

### 6. Notifications Stay Local
- Daily reminders and nudges are scheduled and managed entirely by your phone's operating system (iOS Local Notifications and Android Alarm Manager). No push notification servers or external tokens are used.

### 7. Exporting and Deleting Your Data
- You can export all your saved items at any time into a standard, readable CSV file using **Settings > Export your data**.
- You can remove individual items, purge discarded items at will, or uninstall the app to delete everything instantly.
