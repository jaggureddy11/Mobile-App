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
1. **Automated Suite**: Run `npm test` (all 19 suites / 224 tests must pass).
2. **Typecheck**: Run `npx tsc --noEmit` (clean exit, 0 errors).
3. **Hardware Matrix**: Complete every row in [TESTING.md](file:///Users/apple/Desktop/PROJECTS/Later%20app/TESTING.md) on physical iOS and Android hardware.
4. **App Store Connect**: Ensure App Group `group.com.remind.app` is provisioned in the Apple Developer portal for the Share Extension.
