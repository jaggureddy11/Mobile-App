# Maybe Later — Architecture & Design Decisions (NOTES.md)

## Design vs. Docs Conflict Log & Resolutions

Following the project's rule of precedence:
* **The Design wins on how things look** (palette, layout, typography, visual weight, radii, card styling, micro-animations, tone).
* **The Docs win on how things behave** (local-first data, domain logic, SQLite schema, non-goals, algorithms).

---

### 1. User Accounts & Sign Up
- **Design:** Shows a 5-step onboarding ending in Sign Up (Email/Password, Google, Apple) and a User Profile screen with account credentials.
- **Docs:** Explicit Non-Goal for v1: Local-only, no server, no accounts, no auth, no sync. All data stays private on device.
- **Resolution:** v1 will not include accounts or authentication. Onboarding will be a smooth 2-step flow (Welcome + Nudge Frequency) using the warm visual aesthetic of the design. The third tab uses the Profile screen visual hierarchy adapted for local Settings (nudge frequency, time, quiet hours, CSV export, about/battery optimization).

### 2. Gamification & Streaks
- **Design:** Displays streak counters ("4 days streak"), award badges, and milestone trend graphs.
- **Docs:** Explicit Non-Goal: "Streaks, gamification, or calendar integration... do not build."
- **Resolution:** Excluded from v1. Completed activities trigger the warm celebration animation ("Proud of you. You took a minute when it mattered.") without gamified streak counters, keeping the experience guilt-free and calm.

### 3. Time Chips & Durations
- **Design:** References 5, 10, 15 min chunks in some copy, but Today tab displays 5 min, 15 min, 30 min chips.
- **Docs:** Explicitly specifies chips for **5, 15, and 30 minutes** (default chip: 15 min).
- **Resolution:** Standardized on **5, 15, and 30 minutes** for the Today chips and default item durations (`reel: 1`, `text: 1`, `link: 5`, `task: 15`, `activity: 30`).

### 4. Categorization / Item Types
- **Design:** Uses labels like Articles, Videos, Podcasts, Books.
- **Docs & SQLite Schema:** Defines strict types in `{'link', 'reel', 'text', 'task', 'activity'}`.
- **Resolution:** The domain and SQLite layer will strictly use the 5 schema types (`link`, `reel`, `text`, `task`, `activity`), mapped to warm, friendly badges and icons from the design system.

### 5. "Let it go" & Undo
- **Design:** Shows "Let it go" button on cards.
- **Docs:** Triggers an animated removal, marks `status = 'let_go'`, sets `let_go_at = now()`, displays an Undo snackbar for 5 seconds, and automatically purges items older than 30 days upon app launch.
- **Resolution:** Follows the docs' 5-second Undo snackbar and 30-day purge logic with the warm minimalist animation from the design.

---

## Design Tokens Summary (Extracted from Superdesign Canvas)
- **Palette:**
  - Background Canvas: Warm Cream `#FBF9F6`
  - Secondary Background / Beige: Sandy Beige `#D4C4B0`
  - Surfaces / Card Background: `#FFFFFF` / Soft Cream `#F5F2EB`
  - Primary Text & Elements: Deep Charcoal `#2D2D2D` / `#1A1A1A`
  - Muted Text / Secondary: Warm Taupe / Slate `#7A7265` / `#8C827A`
  - Border: Soft Neutral `#E5E0D8`
  - Accent / Leaf / Subtle Highlight: Warm Sage / Gold `#7C8B68` / `#C5A880`
- **Typography:**
  - Headings: General Sans (or system geometric sans fallback)
  - Body: Satoshi (or system clean grotesque sans fallback)
- **Radii:**
  - Outer containers / modals: `32px` – `40px`
  - Cards & sheets: `20px` – `24px`
  - Chips & buttons: `12px` – `16px` / `9999px` (pill)
- **Shadows:**
  - Diffused soft elevation: `box-shadow: 0px 4px 20px rgba(45, 45, 45, 0.05)`
