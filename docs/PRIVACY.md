# Re:Mind — Privacy Policy

*Last updated: October 2026*

Re:Mind is designed with a strict **offline-first, zero-telemetry** privacy model. We believe your saved articles, reels, thoughts, and habits are private and belong only to you.

---

### 1. Data Stays on Your Device
- All items, notes, tags, timestamps, surface events, collections, and preferences are stored exclusively in a local SQLite database on your device (`maybe_later.db`).
- There is no central database, no user tracking, and your data is never uploaded to any remote server or company infrastructure.

### 2. No Accounts or Profiles
- Re:Mind requires no registration, no login, no email address, and no passwords.
- You can use the app completely anonymously without providing any personally identifying information.

### 3. No Analytics & No Third-Party Crash Reporting
- There are **no analytics SDKs** (such as Google Analytics, Segment, Amplitude, or Mixpanel) bundled in the application.
- There are **no third-party crash reporting tools** (such as Sentry, Bugsnag, or Firebase Crashlytics).
- In the event of a runtime error, a sanitized error entry (containing only the error type, screen name, and timestamp) is stored in a capped in-memory buffer (maximum 50 entries) on your device. It never records URLs, item titles, notes, or user input, and is only exported if you deliberately tap "Copy debug info" in Settings.

### 4. External Network Requests
The app operates 100% offline. The only network connections made by the app are direct interactions you initiate:
1. **Title & Preview Fetching (Metadata Scraping)**: When you save a URL, the app performs a direct `GET` HTTP request from your device to the target website to fetch the public page title, site name, and preview image. No intermediaries or proxy servers are used.
2. **Opening Saved Links**: When you tap "Open Link" or "Do It", the app opens the URL directly in your system default browser or in-app browser (`expo-web-browser`).

### 5. Notifications & Permissions
- Notification scheduling is handled entirely on-device by iOS and Android local notification managers.
- No push notification servers or device tokens are transmitted to external services.
- If you deny notification permission, the app functions completely without them.

### 6. Data Export & Deletion
- You can export all your saved items at any time as an unencrypted, standard CSV file via **Settings > Export your data**.
- You can purge discarded items or delete the application to immediately erase all local data.
