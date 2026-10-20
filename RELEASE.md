# Re:Mind v1.0.0 Release Preparation & Beta Checklist

## 1. App Configuration (`app.json`)
- **Brand / Display Name**: `Re:Mind`
- **Package / Bundle ID**: `com.remind.app`
- **URL Scheme**: `remind://`
- **Supported Orientation**: Portrait-only
- **Theme Background**: `#FBF9F6` (Matches splash screen and brand palette)
- **Native Plugins Configured**:
  - `expo-router` (File-based navigation)
  - `expo-sqlite` (Local offline-first storage with WAL mode enabled)
  - `expo-notifications` (Background daily nudges and permissions)
  - `expo-share-intent` (iOS App Group: `group.com.remind.app`, Android intent filters)
  - `expo-splash-screen` (Centered brand icon with background matching native canvas)

---

## 2. Telemetry & Crash Reporting Strategy
- **Decision**: Zero third-party telemetry / crash reporting SDKs added for v1 beta.
- **Rationale**: Preserves user privacy, keeps binary size minimal, avoids App Store privacy nutrition label disclosures, and prevents third-party SDK crash loops.
- **Diagnostic Logging**:
  - Errors during SQLite migrations, surface event tracking, and background schedulers are caught and logged via `console.warn` in `__DEV__` builds without persisting or transmitting user payload data.

---

## Known Risks
- **`expo-share-intent` SDK Warning**:
  ```text
  » android: expo-share-intent: your Expo SDK version does not match requirements! v8.0.1 needs ^57, found 58.0.0. Please refer to the compatibility table. https://github.com/achorein/expo-share-intent/#versioning
  ```
  - **Mitigation / Status**: Overrides in `package.json` ensure runtime and lockfile stability on Expo SDK 58. `expo prebuild` creates native iOS ShareExtension target, entitlements, and Android intent-filter blocks without errors, but upstream updates should be monitored for an official SDK 58 tag.

---

## 3. EAS Build & Deployment Commands

### Development Build (For Physical Device Testing)
```bash
# iOS Simulator / Device
npx eas build --profile development --platform ios

# Android APK / Internal
npx eas build --profile development --platform android
```

### Preview Internal Build (For TestFlight / Internal Testers)
```bash
npx eas build --profile preview --platform all
```

### Production App Store / Play Store Build
```bash
npx eas build --profile production --platform all
```

---

## 4. Pre-Submission Verification Protocol
Before submitting to Apple App Store or Google Play:
1. **Automated Suite**: Run `npm test` (all test suites must pass).
2. **Typecheck**: Run `npx tsc --noEmit` (clean exit, 0 errors).
3. **Hardware Matrix**: Complete every row in [TESTING.md](file:///Users/apple/Desktop/PROJECTS/Later%20app/TESTING.md) on physical iOS and Android hardware.
4. **App Store Connect**: Ensure App Group `group.com.remind.app` is provisioned in the Apple Developer portal for the Share Extension.

---

## 5. Store Submission Privacy & Data Safety Answer Sheets

### Apple App Store Connect — App Privacy
| Question | Answer | Notes |
| :--- | :--- | :--- |
| **Do you or third-party partners collect data from this app?** | **No** | Re:Mind is 100% offline-first. No user data, analytics, or diagnostics leave the device. |
| **Tracking** | **Does not track** | App does not use IDFA, advertising IDs, or tracking SDKs. |
| **Data Types Collected** | **None** | No Contact Info, Health, Financial, Location, User Content, Browsing History, Identifiers, Usage Data, Diagnostics, or Other Data is collected. |

### Google Play Console — Data Safety
| Question | Answer | Notes |
| :--- | :--- | :--- |
| **Does your app collect or share any user data?** | **No** | App does not transmit or share any user data to remote servers or third parties. |
| **Is all user data collected encrypted in transit?** | **N/A** | No data is collected or transmitted. |
| **Does the app provide a way for users to delete data?** | **Yes** | Users can purge discarded items or delete the app to immediately erase local SQLite storage. |
| **Data Types Shared or Collected** | **None** | No location, personal info, financial info, health, messages, photos/videos, audio, files, calendar, contacts, app activity, web browsing, or app performance data is collected or shared. |

